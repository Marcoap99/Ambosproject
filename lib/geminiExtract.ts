// Helper compartido para pedirle a Gemini una extracción estructurada
// (JSON con schema). Usado por el registro manual (chat) y por el
// parseo de correos de Gmail (M3).

export async function extractStructuredJSON<T>(
  prompt: string,
  schema: Record<string, unknown>,
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("missing_api_key");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema },
      }),
    },
  );

  if (!res.ok) throw new Error(`gemini_api_error: ${res.status}`);

  const data = await res.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) return null;
  return JSON.parse(jsonText) as T;
}
