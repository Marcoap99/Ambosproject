import webpush from "web-push";

// PRD §5.2 — recordatorio de check-in. Configura VAPID una sola vez al
// importar (todas las llamadas de este proceso comparten la config).
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:soporte@ambos.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

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
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, expired: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: statusCode === 404 || statusCode === 410 };
  }
}
