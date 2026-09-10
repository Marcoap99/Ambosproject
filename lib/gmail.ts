// Helpers de Gmail API — todo esto corre en el servidor, nunca en el
// cliente (PRD §8). Usa el refresh_token guardado en gmail_credentials
// para conseguir un access_token nuevo cada vez (los access_token de
// Google duran ~1h, no se guardan).

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`refreshAccessToken failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

/** Le pide a Gmail que avise a nuestro topic de Pub/Sub cuando llegue correo nuevo. */
export async function watchMailbox(accessToken: string): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch(`${GMAIL_API}/users/me/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topicName: process.env.GMAIL_PUBSUB_TOPIC,
      labelIds: ["INBOX"],
      labelFilterAction: "include",
    }),
  });
  if (!res.ok) {
    throw new Error(`watchMailbox failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface HistoryRecord {
  messagesAdded?: { message: { id: string } }[];
}

/** Mensajes nuevos desde el último historyId conocido. */
export async function listNewMessageIds(accessToken: string, startHistoryId: string): Promise<string[]> {
  const url = new URL(`${GMAIL_API}/users/me/history`);
  url.searchParams.set("startHistoryId", startHistoryId);
  url.searchParams.set("historyTypes", "messageAdded");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`listNewMessageIds failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const history: HistoryRecord[] = data.history ?? [];
  const ids = new Set<string>();
  for (const h of history) {
    for (const m of h.messagesAdded ?? []) ids.add(m.message.id);
  }
  return [...ids];
}

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  bodyText: string;
  internalDate: string;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractPlainText(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: { mimeType?: string; body?: { data?: string } }[];
}): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  // sin text/plain — como último recurso, cualquier parte con body
  for (const part of payload.parts ?? []) {
    if (part.body?.data) return decodeBase64Url(part.body.data);
  }
  return "";
}

export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: data.id,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    bodyText: extractPlainText(data.payload ?? {}),
    internalDate: data.internalDate,
  };
}
