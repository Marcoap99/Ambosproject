import { createClient } from "@/lib/supabase/client";

// Recordatorio push de check-in (PRD §5.2) — todo lo que corre en el
// navegador para activarlo/desactivarlo. El envío real vive en lib/push.ts
// (server-only) + app/api/push/send-reminders (cron).

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

export type PushStatus = "unsupported" | "denied" | "subscribed" | "not-subscribed";

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "subscribed" : "not-subscribed";
}

export async function enablePushReminder(userId: string): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = subscription.toJSON();
  const supabase = createClient();
  await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: json.endpoint!, keys: json.keys },
    { onConflict: "endpoint" },
  );
  return true;
}

export async function disablePushReminder(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
