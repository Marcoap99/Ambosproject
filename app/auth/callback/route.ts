import { NextResponse } from "next/server";

import { watchMailbox } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Google solo manda provider_refresh_token la PRIMERA vez que el
      // usuario consiente (con access_type=offline+prompt=consent, ver
      // app/login). Sin esto no hay forma de leer su Gmail sin que tenga
      // la sesión abierta — M3 depende de guardarlo apenas aparece.
      const refreshToken = data.session?.provider_refresh_token;
      if (refreshToken && data.user) {
        const admin = createAdminClient();
        await admin
          .from("gmail_credentials")
          .upsert({ user_id: data.user.id, refresh_token: refreshToken }, { onConflict: "user_id" });

        // Best-effort: si Pub/Sub todavía no está configurado
        // (GMAIL_PUBSUB_TOPIC vacío) esto falla y no debe romper el login
        // — el cron de renew-watch lo intenta de nuevo más tarde igual.
        try {
          const accessToken = data.session.provider_token!;
          const { historyId, expiration } = await watchMailbox(accessToken);
          await admin
            .from("gmail_credentials")
            .update({
              watch_expiration: new Date(Number(expiration)).toISOString(),
              history_id: historyId,
            })
            .eq("user_id", data.user.id);
        } catch (err) {
          console.error("watchMailbox en login falló (¿Pub/Sub configurado?):", err);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
