import { NextResponse } from "next/server";

import { extractStructuredJSON } from "@/lib/geminiExtract";

// PRD §5.5: registro manual en lenguaje natural, "propongo, confirmas".
// Gemini Flash-Lite (nivel gratuito de Google AI Studio) — decisión de
// costo de Marco para el MVP, ver CLAUDE.md.

const EXPENSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    monto: {
      type: "NUMBER",
      description: "Monto del gasto en soles (PEN), sin el símbolo S/.",
    },
    comercio: {
      type: "STRING",
      description: "Nombre del comercio mencionado, o cadena vacía.",
    },
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

interface ExpenseExtraction {
  monto: number;
  comercio: string;
  categoria: string;
  medio_pago: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }

  try {
    const result = await extractStructuredJSON<ExpenseExtraction>(
      `Extrae los datos de este gasto en soles peruanos (PEN), descrito en lenguaje natural: "${text}"`,
      EXPENSE_SCHEMA,
    );
    if (!result) return NextResponse.json({ error: "parse_failed" }, { status: 422 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "gemini_api_error" }, { status: 502 });
  }
}
