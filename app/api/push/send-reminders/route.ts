import { NextResponse } from "next/server";

import { getPeruDateString } from "@/lib/date";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

// PRD §5.2 — recordatorio push a las 8:00 p.m. hora de Perú si todavía no
// contestó el check-in ese día. Vercel Cron llama esto a las 01:00 UTC
// (= 20:00 Perú, sin horario de verano) — ver vercel.json.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = getPeruDateString();

  const { data: checkedIn } = await admin.from("check_ins").select("user_id").eq("fecha", today);
  const respondedIds = new Set((checkedIn ?? []).map((c) => c.user_id));

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, keys");

  let sent = 0;
  let expired = 0;

  for (const sub of subscriptions ?? []) {
    if (respondedIds.has(sub.user_id)) continue;

    const result = await sendPush(
      { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
      { title: "Ambos", body: "¿Tuviste gastos con tu pareja hoy?" },
    );

    if (result.expired) {
      await admin.from("push_subscriptions").delete().eq("id", sub.id);
      expired++;
    } else if (result.ok) {
      sent++;
    }
  }

  return NextResponse.json({ sent, expired });
}
