import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// PRD §5.5: registro manual en lenguaje natural, "propongo, confirmas".
// Haiku 4.5 alcanza de sobra para esta extracción estructurada de una
// frase corta — no hace falta el modelo más grande para esto.
const MODEL = "claude-haiku-4-5-20251001";

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extraer_gasto",
  description:
    "Extrae los datos de un gasto a partir de una descripción en lenguaje natural en español (Perú).",
  input_schema: {
    type: "object",
    properties: {
      monto: {
        type: "number",
        description: "Monto del gasto en soles (PEN), como número, sin el símbolo S/.",
      },
      comercio: {
        type: "string",
        description: "Nombre del comercio o lugar mencionado. Cadena vacía si no se menciona.",
      },
      categoria: {
        type: "string",
        enum: ["Comida", "Salidas", "Transporte", "Compras", "Otro"],
        description: "Categoría más cercana al gasto. Usa 'Otro' si no calza con ninguna.",
      },
      medio_pago: {
        type: "string",
        enum: ["efectivo", "yape", "plin", "agora", "tarjeta_debito", "tarjeta_credito", "banco"],
        description: "Medio de pago mencionado. Si no se menciona ninguno, usa 'efectivo'.",
      },
    },
    required: ["monto", "comercio", "categoria", "medio_pago"],
  },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extraer_gasto" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "parse_failed" }, { status: 422 });
    }

    return NextResponse.json(toolUse.input);
  } catch {
    return NextResponse.json({ error: "claude_api_error" }, { status: 502 });
  }
}
