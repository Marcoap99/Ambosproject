import { NextResponse } from "next/server";

// PRD §5.5: registro manual en lenguaje natural, "propongo, confirmas".
// Gemini Flash-Lite (nivel gratuito de Google AI Studio) — decisión de
// costo de Marco para el MVP, ver CLAUDE.md. "-latest" evita romperse cada
// vez que Google retira una versión puntual del modelo.
const MODEL = "gemini-flash-lite-latest";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    monto: { type: "NUMBER", description: "Monto del gasto en soles (PEN), sin el símbolo S/." },
    comercio: { type: "STRING", description: "Nombre del comercio mencionado, o cadena vacía." },
    categoria: {
      type: "STRING",
      enum: ["Comida", "Salidas", "Transporte", "Compras", "Otro"],
      description: "Categoría más cercana. 'Otro' si no calza con ninguna.",
    },
    medio_pago: {
      type: "STRING",
      enum: ["efectivo", "yape", "plin", "agora", "tarjeta_debito", "tarjeta_credito", "banco"],
      description: "Medio de pago mencionado. 'efectivo' si no se menciona ninguno.",
    },
  },
  required: ["monto", "comercio", "categoria", "medio_pago"],
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extrae los datos de este gasto en soles peruanos (PEN), descrito en lenguaje natural: "${text}"`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "gemini_api_error" }, { status: 502 });
    }

    const data = await res.json();
    const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      return NextResponse.json({ error: "parse_failed" }, { status: 422 });
    }

    return NextResponse.json(JSON.parse(jsonText));
  } catch {
    return NextResponse.json({ error: "gemini_api_error" }, { status: 502 });
  }
}
