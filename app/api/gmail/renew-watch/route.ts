import { NextResponse } from "next/server";

import { refreshAccessToken, watchMailbox } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";

// El watch() de Gmail expira a los 7 días — Vercel Cron llama esto una
// vez al día (ver vercel.json) para renovar el de cada usuario antes de
// que venza.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 días de margen

  const { data: rows } = await admin
    .from("gmail_credentials")
    .select("user_id, refresh_token")
    .or(`watch_expiration.is.null,watch_expiration.lt.${soon}`);

  let renewed = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      const accessToken = await refreshAccessToken(row.refresh_token);
      const { historyId, expiration } = await watchMailbox(accessToken);
      await admin
        .from("gmail_credentials")
        .update({ watch_expiration: new Date(Number(expiration)).toISOString(), history_id: historyId })
        .eq("user_id", row.user_id);
      renewed++;
    } catch (err) {
      console.error(`renew-watch failed for user ${row.user_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ renewed, failed });
}
