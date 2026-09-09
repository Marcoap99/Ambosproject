# Ambos

App de gastos compartidos para parejas. En vez de anotar gastos a mano en un chat, **lee las notificaciones de pago de Gmail** (Yape, Plin, banco) y arma el registro solo — cada uno clasifica lo suyo, el saldo entre los dos se calcula automático.

## Estado del proyecto

Fase actual: **diseño cerrado, listo para empezar desarrollo.** No hay código de producto todavía — este repo por ahora es research + spec + diseño.

## Contenido

| Archivo | Qué es |
|---|---|
| [`PRD.md`](./PRD.md) | Spec funcional completa — escrita para que Dev (Claude Code u otro) empiece a programar sin depender de preguntarle a nadie más. Flujos, modelo de datos, lógica de negocio, stack recomendado, fuera de alcance. |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Tokens de color/tipografía/espaciado extraídos del prototipo, más la documentación de los personajes ilustrados (perrito de racha, moneda, avatares). |
| [`design/`](./design) | Fuente del prototipo clickeable (formato Claude Design Components — `.dc.html`). No es el código final, es la referencia de interacción para Dev. |
| [`assets/`](./assets) | Los personajes ilustrados en JPG, listos para usar como están (o de referencia si se regeneran). |

## Prototipo clickeable

👉 **[Ver el prototipo](https://claude.ai/code/artifact/77ce7f10-d8b2-4c46-9f91-e3d212e27095)** — Onboarding + uso diario, con toda la interacción real (no son solo mockups estáticos).

## Personajes

| Archivo | Personaje | Dónde aparece |
|---|---|---|
| `dog-neutral.jpg` | Perrito, ánimo neutral | Check-in diario (antes de responder), bienvenida de onboarding |
| `dog-worried.jpg` | Perrito, preocupado | Check-in declinado ("Hoy no") |
| `dog-happy.jpg` | Perrito, feliz | Generado, aún sin usar en el flujo — disponible para un futuro estado de "racha completada" |
| `coin.jpg` | Moneda | Chat de registro manual, pregunta "¿Personal o de los dos?" |
| `boy-bust.jpg` / `girl-bust.jpg` | Avatares de perfil | Header de la app, onboarding "Conectados" |
| `hug.jpg` | Escena de abrazo | Pantalla de ciclo liquidado |

Ver `DESIGN_SYSTEM.md` §6 para el criterio completo de cuándo usa cada uno.

## Pendientes conocidos

- `hug.jpg` incluye una copa de vino no pedida — se dejó así, no es editable en código (habría que regenerar en Gemini si se quiere quitar).
- Sin modo oscuro real para los personajes ilustrados (son fotos con fondo crema fijo).
- Sin tercera opción de género neutral en onboarding (alcance de MVP).
