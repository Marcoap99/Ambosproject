import { extractStructuredJSON } from "./geminiExtract";

// PRD §5.3: "Si el parser no logra extraer monto o comercio de un correo
// con confianza, ese correo no genera un Movement automático — se
// descarta silenciosamente." En vez de pedirle a Gemini un puntaje de
// confianza (los modelos no son buenos calibrando eso), se le pide un
// booleano simple "es notificación de pago" + los campos — y la
// confianza real es un chequeo determinístico sobre esos campos.

const EMAIL_SCHEMA = {
  type: "OBJECT",
  properties: {
    es_notificacion_de_pago: {
      type: "BOOLEAN",
      description:
        "true solo si este correo es una notificación real de un pago/consumo (banco, Yape, Plin, tarjeta). false para promociones, estados de cuenta, resúmenes, o cualquier otra cosa.",
    },
    monto: { type: "NUMBER", description: "Monto del pago en soles (PEN), sin el símbolo S/." },
    comercio: { type: "STRING", description: "Comercio o destinatario del pago." },
    medio_pago: {
      type: "STRING",
      enum: ["yape", "plin", "agora", "tarjeta_debito", "tarjeta_credito", "banco"],
      description: "Medio de pago que corresponde a este correo (nunca 'efectivo' — un correo no puede notificar un pago en efectivo).",
    },
  },
  required: ["es_notificacion_de_pago", "monto", "comercio", "medio_pago"],
};

interface EmailExtraction {
  es_notificacion_de_pago: boolean;
  monto: number;
  comercio: string;
  medio_pago: string;
}

export interface ParsedEmailExpense {
  monto: number;
  comercio: string;
  medio_pago: string;
}

/** Devuelve null si el correo no es una notificación de pago interpretable con confianza. */
export async function parseEmailExpense(
  from: string,
  subject: string,
  bodyText: string,
): Promise<ParsedEmailExpense | null> {
  // Recortado — no hace falta mandar correos gigantes, y evita gastar
  // tokens de más en firmas/legales largos al final del correo.
  const truncatedBody = bodyText.slice(0, 3000);

  let result: EmailExtraction | null;
  try {
    result = await extractStructuredJSON<EmailExtraction>(
      `¿Este correo es una notificación de pago (banco, Yape, Plin, tarjeta)? Si lo es, extrae el monto, el comercio y el medio de pago.\n\nDe: ${from}\nAsunto: ${subject}\n\n${truncatedBody}`,
      EMAIL_SCHEMA,
    );
  } catch {
    return null;
  }

  if (!result) return null;
  if (!result.es_notificacion_de_pago) return null;
  if (!result.monto || result.monto <= 0) return null;
  if (!result.comercio || !result.comercio.trim()) return null;

  return { monto: result.monto, comercio: result.comercio.trim(), medio_pago: result.medio_pago };
}
