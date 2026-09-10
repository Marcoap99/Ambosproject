import { NextResponse } from "next/server";

import { getMessage, listNewMessageIds, refreshAccessToken } from "@/lib/gmail";
import { findMatchingMethod } from "@/lib/labels";
import { parseEmailExpense } from "@/lib/parseEmailExpense";
import { createAdminClient } from "@/lib/supabase/admin";

// Google Cloud Pub/Sub push subscription apunta acá. Autenticación simple
// por token compartido en la URL (no JWT completo de Pub/Sub) — suficiente
// para un piloto de 2 personas: en el peor caso alguien crea un Movement
// espurio sin clasificar, que se puede borrar; nunca compromete datos
// privados (§7.4 sigue aplicando igual). Documentado en CLAUDE.md.
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== process.env.GMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dataB64 = body?.message?.data;
  if (!dataB64) return NextResponse.json({ ok: true }); // nada que procesar

  const decoded = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8"));
  const emailAddress: string | undefined = decoded.emailAddress;
  const newHistoryId: string | undefined = decoded.historyId?.toString();
  if (!emailAddress || !newHistoryId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id")
    .eq("email", emailAddress)
    .maybeSingle();
  if (!user) return NextResponse.json({ ok: true }); // no es un usuario nuestro

  const { data: creds } = await admin
    .from("gmail_credentials")
    .select("refresh_token, history_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!creds) return NextResponse.json({ ok: true });

  try {
    const accessToken = await refreshAccessToken(creds.refresh_token);

    if (creds.history_id) {
      const messageIds = await listNewMessageIds(accessToken, creds.history_id);

      if (messageIds.length > 0) {
        const [{ data: couple }, { data: paymentMethods }] = await Promise.all([
          admin
            .from("couples")
            .select("id, current_cycle_id")
            .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
            .maybeSingle(),
          admin.from("payment_methods").select("id, tipo, banco").eq("user_id", user.id),
        ]);

        if (couple?.current_cycle_id) {
          for (const messageId of messageIds) {
            const message = await getMessage(accessToken, messageId);
            if (!message) continue;

            const parsed = await parseEmailExpense(message.from, message.subject, message.bodyText);
            if (!parsed) continue; // sin confianza — descarte silencioso, PRD §5.3

            const paymentMethod = findMatchingMethod(paymentMethods ?? [], parsed.medio_pago);

            await admin.from("movements").insert({
              user_id: user.id,
              couple_id: couple.id,
              cycle_id: couple.current_cycle_id,
              merchant: parsed.comercio,
              amount: parsed.monto,
              source: "email_parsed",
              payment_method_id: paymentMethod?.id ?? null,
              payer_user_id: user.id,
              timestamp: new Date(Number(message.internalDate)).toISOString(),
            });
          }
        }
      }
    }

    await admin.from("gmail_credentials").update({ history_id: newHistoryId }).eq("user_id", user.id);
  } catch (err) {
    // No devolver error a Pub/Sub por un fallo de parseo/API — evita
    // reintentos infinitos por un correo puntual raro. Se pierde ese
    // correo, pero el registro manual es el respaldo (PRD §5.3/§5.5).
    console.error("gmail webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
