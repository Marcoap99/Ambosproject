import webpush from "web-push";

// PRD §5.2 — recordatorio de check-in. `setVapidDetails` valida el formato
// de las llaves y TIRA si faltan o están vacías — nunca llamarlo a nivel de
// módulo (rompería el build/deploy entero apenas Next.js importa este
// archivo, incluso en rutas que no mandan push, si las variables VAPID
// todavía no están puestas en Vercel). Se configura perezoso, una sola vez,
// la primera vez que de verdad se manda un push.
let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:soporte@ambos.app",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Manda un push. Devuelve `expired: true` si la suscripción ya no sirve
 * (404/410 — el navegador la invalidó), para que el caller la borre. */
export async function sendPush(
  subscription: StoredSubscription,
  payload: { title: string; body: string },
): Promise<{ ok: boolean; expired: boolean }> {
  if (!ensureVapidConfigured()) {
    console.error("sendPush: faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en el entorno.");
    return { ok: false, expired: false };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, expired: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: statusCode === 404 || statusCode === 410 };
  }
}
