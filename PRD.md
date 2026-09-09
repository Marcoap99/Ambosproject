# Ambos — PRD

Documento de requerimientos para construir el MVP. Escrito para que un agente de desarrollo (Claude Code) lo use como fuente de verdad al programar, sin que quede ninguna decisión de producto o UX pendiente de preguntar. Referencia visual del flujo completo (wireframe clickeable): https://claude.ai/code/artifact/77ce7f10-d8b2-4c46-9f91-e3d212e27095

---

## 1. Qué es

App para parejas que automatiza el registro de gastos compartidos leyendo las notificaciones de pago que ya llegan por correo (banco, Yape, Plin), en vez de depender de que alguien se acuerde de anotarlo en el chat. El usuario solo clasifica en 1-2 taps; el resto lo captura la app sola.

**No es** un Splitwise genérico. Es específico a la fricción de pareja: transparencia total entre dos personas, sin vergüenza ni acusación, con el mínimo esfuerzo posible.

## 2. Problema (JTBD)

> Cuando pago algo compartido en un momento que no es el adecuado para resolverlo ahí mismo (hay una conversación, hay distracción, hay algo más importante pasando), quiero que quede separado de mis gastos personales sin que se me exija hacerlo en el momento, para poder ajustar cuentas después con datos reales y no con una aproximación de la que ya sé que no puedo confiar.

**Insight validado (autoetnografía, 2 episodios reales):** el dato del gasto ya existe (el banco lo tiene). El problema no es la falta de información — es que vive mezclada con el historial personal, y el momento del pago casi nunca es el adecuado para separarla. Para cuando la pareja se sienta a arreglar cuentas, ya no confía en su propia memoria para reconstruirlas, y esa desconfianza —no el monto— es la verdadera incomodidad.

## 3. Principios de diseño

| Principio | Qué significa en la práctica |
|---|---|
| Facilidad | 0-2 decisiones por gasto. Nada que se sienta como trabajo. |
| Transparencia total | Los dos ven todo el historial compartido, para detectar errores/duplicados juntos, no para vigilar. |
| Privacidad de lo no clasificado | Cada quien solo ve y clasifica **sus propios** movimientos captados. Lo del otro aparece recién cuando esa persona ya lo clasificó y quedó registrado. Regla dura — ver §7.4. |
| Sin presión | Clasificar es asíncrono. Nunca se exige hacerlo en el momento del gasto. |
| Compañía, no ansiedad | La gamificación motiva por hábito compartido (racha de check-in), nunca por miedo a perder o por deuda pendiente (Octalysis de Yu-kai Chou: motor en Core Drive 5 social, evitar Core Drive 8 pérdida). |
| Automatización primero | El input manual es el respaldo, no el camino principal. |

## 4. Usuarios y alcance del MVP

- Piloto: una pareja (2 usuarios), ambos en Perú, ambos Android.
- Pensado desde el día uno como plataforma general (parejas → roommates → amigos), pero el MVP solo resuelve el caso de pareja: exactamente 2 usuarios por `Couple`, sin soporte de grupos de 3+.
- Un solo idioma (español), una sola moneda (PEN, soles) — sin multi-moneda ni multi-idioma en el MVP.
- Plataforma: **PWA instalable** (no Play Store) — se instala vía link, sin fricción de tienda ni proceso de review. Justificado porque ambos son Android (soporte de Web Push razonable) y permite iterar rápido.

### 4.1 Stack recomendado (para que alguien programe sin tener que decidir esto primero)

No hay una decisión previa de stack — se propone uno concreto, ajustable si quien construye tiene una preferencia fuerte:

| Capa | Recomendación | Por qué |
|---|---|---|
| Frontend / PWA | Next.js + TypeScript, con manifest + service worker para instalación y Web Push | Soporta SSR para carga rápida, y el ecosistema de PWA en React está maduro |
| Backend / DB | Supabase (Postgres + Auth + Storage) | Postgres real para las relaciones del modelo de datos (§6), Storage para los comprobantes de liquidación, y evita construir auth desde cero |
| Captura de correo | Gmail API con `users.watch()` + Google Cloud Pub/Sub (push, no polling) | El research validó que los correos de banco llegan casi al instante — polling cada X minutos reintroduce el retraso que el producto existe para eliminar |
| Parseo de gasto manual (chat/voz) | Claude API (Anthropic) para extraer monto/categoría/medio de texto libre; Web Speech API del navegador para voz → texto antes de mandarlo a Claude | No es un formulario, es lenguaje natural — necesita un modelo, no regex |
| Notificaciones | Web Push estándar (VAPID) | Nativo de PWA, sin dependencia de Firebase si no se quiere |

## 5. Flujos (con estados)

### 5.1 Onboarding
1. Datos básicos: solo nombre. No se pide nada más en el MVP (ni foto, ni apellido).
2. **Conectar Gmail (OAuth de Google) — obligatorio.** Scope mínimo: `gmail.readonly`. No hay cuenta sin este paso; es la forma en la que se crea la cuenta, no un paso posterior opcional.
3. Medios de pago — selección múltiple por grupo:
   - Tarjetas: Débito, Crédito
   - Billeteras digitales: Yape, Plin, Agora
   - Banco principal: BCP, BBVA, Interbank, Scotiabank, BanBif
4. Emparejamiento: se genera un **código/link de invitación** (no cruce por correo — evita typos y no depende de que la otra persona ya tenga cuenta). Se comparte por WhatsApp. Cuando la pareja lo abre y completa su propio onboarding, ambas cuentas quedan enlazadas.

**Casos borde del emparejamiento — explícitamente fuera del MVP, no construir:**
- Código inválido o expirado (definir expiración es v2).
- Un usuario que ya tiene `Couple` activo intenta emparejarse de nuevo (v2 — por ahora, un `Couple` por usuario, sin re-emparejamiento ni "romper pareja").
- Ninguna de estas rutas necesita pantalla propia en el MVP; con mostrar un error genérico ("este código ya no funciona") alcanza.

### 5.2 Check-in diario ("Hoy")
- Corte de día: **calendario, medianoche a medianoche en la zona horaria del dispositivo de cada usuario** (no un huso horario fijo del servidor — cada quien clasifica según su propio día).
- Recordatorio push por defecto a las **8:00 p.m. hora local** si todavía no contestó el check-in ese día. Es una constante fija en el MVP, no configurable desde Ajustes (eso es v2).
- Pregunta: "¿Tuviste gastos con tu pareja hoy?" — Sí / No.
- **No** → 1 tap, listo. La racha de check-in continúa (la racha es del hábito de contestar, no del dinero).
- **Sí** → pasa a Clasificar. Si no hay ningún movimiento capturado ese día (Gmail no detectó nada), Clasificar muestra su propio estado vacío en vez de una lista en blanco: "No detectamos gastos hoy — ¿se te pasó algo? Regístralo a mano" con acceso directo al registro manual (§5.5).
- **Día de gracia:** si no se contestó el día anterior, aparece un banner una sola vez ofreciendo agregarlo retroactivamente. Si tampoco se contesta ahí, se pierde — nunca se acumula backlog indefinido (eso recrearía el problema original).
- Racha semanal visible (7 días, estilo hábito, no streak punitivo).

### 5.3 Clasificar
- Muestra **solo los movimientos propios** del usuario (ver regla de privacidad, §7.4), capturados ese día vía Gmail.
- Por movimiento: metadata visible (comercio, monto, con qué cuenta se pagó, hora).
- **Si el parser no logra extraer monto o comercio de un correo con confianza**, ese correo no genera un `Movement` automático — se descarta silenciosamente (no se le muestra al usuario un movimiento con datos en blanco). El registro manual (§5.5) es el respaldo para lo que el parser no capturó.
- Personal / Pareja (con ícono + color propios — Pareja siempre en tono cálido incluso sin seleccionar, para que no se confunda con "estoy viendo el correo del otro").
- Si Pareja: división — **slider de 0 a 100** (no binario), default 50/50. En los extremos: 0 = "tu pareja invita" (paga todo esa persona, sin generar deuda) / 100 = el espejo. Ver fórmula en §7.
- Categoría (Comida, Salidas, Transporte, Compras + agregar propia con emoji). **Es opcional** — no bloquea continuar, a diferencia de Personal/Pareja que sí es obligatorio por movimiento.
- Botón "Ver saldo" se habilita cuando todos los movimientos del día tienen Personal/Pareja asignado (la categoría puede quedar sin poner).

### 5.4 Saldo
- **Bidireccional** — no asume que siempre paga la misma persona. Se calcula neto entre ambos (ver §7.1).
- Montos en soles, hasta 2 decimales, redondeo estándar (no truncar).
- Muestra "Hoy compartieron S/X" y "Tu pareja te debe / Le debes a tu pareja / Están a mano S/Y".
- Botón "Liquidar" (solo si hay saldo pendiente) → pantalla de comprobante: adjuntar captura de la transferencia real (Yape entre ellos) como evidencia, guardada permanentemente → confirmar → estado "Ajustado".
- La liquidación **no tiene que ser el mismo día** — el saldo se acumula en un Ciclo (§5.6) hasta que decidan cerrarlo.
- **Al liquidar un ciclo, todos sus `Movement` quedan de solo lectura** (no editables ni borrables desde Historial). Cualquier corrección después de ese punto se registra como un movimiento nuevo en el ciclo siguiente, ya abierto automáticamente. Esto protege que el comprobante archivado siga significando lo que decía cuando se guardó.

### 5.5 Registro manual (efectivo o cualquier medio que no llegó por correo)
- Accesible con un botón flotante desde "Hoy".
- Interfaz de **chat** (no formulario): el usuario escribe o dicta el gasto en lenguaje natural, el sistema propone monto + categoría + medio de pago (con Efectivo priorizado primero, seguido de Yape/Plin/Débito/Crédito) en una tarjeta de confirmación → el usuario confirma o edita.
- Mismo patrón de "propongo, confirmas" ya validado en el research de referencia (teardown del piloto Monedita). Ver stack recomendado (§4.1) para qué lo resuelve técnicamente.
- Un movimiento manual entra directo con `source = manual` y `payer_user_id` = quien lo registró — pasa por el mismo flujo de clasificación que uno capturado por correo.

### 5.6 Historial
- Feed transparente: gastos de los dos, siempre visible (después de clasificados — nunca antes, ver §7.4).
- Filtro: Todos / Tú / Tu pareja (por cuenta, no por categoría).
- Barra de balance visual (centro = a mano, se corre hacia un lado según quién debe).
- Cada item: editable (reclasificar Personal/Pareja + categoría) y borrable.
- **"Borrar" es soft-delete**: el `Movement` se marca `deleted_at`, no se elimina de la base de datos. Un movimiento borrado se excluye de ahí en adelante de saldo, total del ciclo y dashboards — el saldo se recalcula sin él en cuanto se borra.
- Reclasificar Personal → Pareja en un movimiento ya registrado le asigna `split_ratio = 0.5` (el default) — no arrastra ningún valor previo, porque como Personal no tenía split.
- **Regla de confirmación:** si se reclasifica un gasto de Pareja → Personal, pedir confirmación explícita antes de sacarlo de la vista compartida (afecta lo que ve el otro usuario). Personal → Pareja no necesita confirmación.
- Estado vacío cuando no hay nada que mostrar (día uno, o filtro sin resultados).
- Un movimiento que pertenece a un ciclo ya liquidado no muestra los íconos de editar/borrar (ver regla de solo-lectura, §5.4).

### 5.7 Ciclos
- Un `Couple` siempre tiene exactamente un ciclo abierto. Se crea automáticamente al emparejarse, y automáticamente de nuevo apenas se liquida el anterior — nunca hay un momento sin ciclo abierto.
- Todo movimiento clasificado como Pareja se asigna al ciclo abierto en ese momento. Al liquidar, el ciclo se archiva (con su comprobante si lo tiene) y arranca el siguiente vacío.
- Dashboard por ciclo: desglose de gasto por categoría (barras, no dona — más legible en espacio chico).
- Resumen general (agregado, filtrable por mes o año a la fecha): total histórico, promedio por ciclo, categoría top, comparación de cuánto ha pagado cada uno de lo compartido.
- Indicador de progreso del ciclo abierto (días abiertos + récord de la pareja) — **logro compartido, nunca cuenta regresiva ni alarma** (ver §3).
- Estado vacío cuando no hay ciclos liquidados todavía (el ciclo abierto siempre existe, así que esto solo aplica al historial de liquidados).

### 5.8 Ajustes
- Apodo, estado de emparejamiento, cuenta de Gmail conectada, cerrar sesión.
- FAQ / ayuda.
- Modo oscuro — **placeholder visual únicamente en el wireframe**, falta implementar el theming real. No bloquea el MVP.

## 6. Modelo de datos

```
User
  id, nombre, email (Gmail OAuth), fecha_registro

Couple
  id, user_a_id, user_b_id, invite_code, fecha_emparejamiento
  current_cycle_id                     -- siempre apunta al ciclo abierto

PaymentMethod
  id, user_id, tipo (tarjeta_debito | tarjeta_credito | yape | plin | agora | banco), banco (opcional)

Movement
  id, user_id, couple_id, cycle_id
  merchant, amount, currency (siempre 'PEN'), timestamp
  source (email_parsed | manual)
  payment_method_id
  payer_user_id            -- quién pagó (igual a user_id, explícito para que la query de saldo no ambigüe)
  classification (null | personal | pareja)
  split_ratio (0.0–1.0, default 0.5)   -- fracción que le corresponde al NO pagador; irrelevante si classification != pareja
  category (texto libre, nullable)
  classified_at (nullable)
  deleted_at (nullable)     -- soft delete, ver §5.6

Cycle
  id, couple_id, status (abierto | liquidado)
  fecha_inicio, fecha_cierre (nullable hasta liquidar)
  proof_attachment_url (nullable, solo al liquidar)

HistorialOverride
  -- NO es una tabla aparte: reclasificar un Movement ya registrado
  -- actualiza classification/category directamente sobre el mismo registro,
  -- con classified_at actualizado. No hace falta versionar el historial de cambios en el MVP.

PushSubscription
  id, user_id, endpoint, keys (VAPID)   -- para el recordatorio de check-in (§5.2)
```

## 7. Lógica de negocio

### 7.1 Cálculo de saldo (bidireccional)

Para cada `Movement` con `classification = pareja`, `split_ratio > 0` y `deleted_at IS NULL`, del ciclo abierto:

```
share = amount * split_ratio
if payer_user_id == usuario_actual:
    net += share       // la pareja le debe ese monto
else:
    net -= share       // el usuario le debe a la pareja
```

- `net > 0` → "Tu pareja te debe S/{net}"
- `net < 0` → "Le debes a tu pareja S/{abs(net)}"
- `net == 0` → "Están a mano"

**`split_ratio = 0` ("invito") se excluye por completo** — ni del saldo pendiente ni del total "compartido hoy". Si alguien invita, ese gasto no debe inflar ninguna métrica de deuda ni de gasto compartido total. Este fue un bug real detectado y corregido en el wireframe: en una primera versión, un gasto "invito" seguía sumando al total mostrado aunque no generara deuda.

> **Nota sobre el wireframe:** en el prototipo (una sola pantalla, un solo "dispositivo"), la contribución de la pareja se simuló con una constante fija porque no había una segunda sesión real clasificando en paralelo. **Eso no existe en el producto real** — ahí el saldo simplemente suma los `Movement` de los dos usuarios del `Couple` desde la base de datos compartida, sin ninguna constante ni caso especial. No replicar el hack del wireframe.

### 7.2 Etiqueta del split (para mostrar en UI)

```
if ratio == 0: "Yo invito" (si pagó el usuario actual) | "Tu pareja invita" (si pagó ella)
if ratio == 0.5: "50 / 50"
else: "{Pagador} {(1-ratio)*100}% / {Otro} {ratio*100}%"
```

### 7.3 Total compartido del ciclo

Suma de `amount` de todos los `Movement` del ciclo con `classification = pareja`, `split_ratio > 0` y `deleted_at IS NULL` (excluye invitaciones y borrados, igual criterio que el saldo).

### 7.4 Regla de privacidad (crítica)

**Un usuario nunca ve los movimientos capturados de su pareja hasta que ella misma los haya clasificado.**

- La pantalla de Clasificar de cada usuario filtra `Movement` por `payer_user_id == usuario_actual`. Nunca se muestra un movimiento cuyo pagador sea el otro usuario, sin importar que ya esté disponible en el backend por el parseo de correo.
- Recién cuando el otro usuario clasifica su propio movimiento (`classification` deja de ser null), ese movimiento se vuelve visible para ambos en Historial.
- Esto no es una preferencia de UX — es la razón de ser de la app: automatizar sin convertirse en vigilancia. Si se rompe esta regla, el producto dejó de resolver el problema que lo originó.

### 7.5 Categorías

Set base: Comida, Salidas, Transporte, Compras. El usuario puede agregar categorías propias (emoji + texto libre). No hay tabla de categorías compartida en el MVP — es texto libre por movimiento; normalizar en v2 si hace falta reportar por categoría de forma más estricta.

## 8. Seguridad y privacidad de datos

- Tokens OAuth de Gmail: cifrados en reposo, nunca expuestos al cliente (todo el acceso a Gmail pasa por el backend).
- Solo se guarda la metadata extraída del correo (comercio, monto, fecha, remitente) — **no se almacena el cuerpo completo del correo** una vez parseado.
- Comprobantes de liquidación (capturas de Yape): almacenamiento privado con URLs firmadas de vida corta, nunca públicas.
- Dato sensible por naturaleza (acceso a correo + información financiera de dos personas) — tratar bajo la Ley de Protección de Datos Personales de Perú (Ley N.º 29733) desde el diseño: consentimiento explícito en el onboarding para leer Gmail, y opción de eliminar la cuenta (borra tokens y datos) desde Ajustes — **esta opción de borrar cuenta falta en el wireframe, agregar en el build.**

## 9. Fuera de alcance del MVP (backlog v2)

- Reglas de auto-clasificación (gastos personales recurrentes que nunca entran a la cola de clasificar).
- Split por defecto configurable por categoría (ej. renta siempre 60/40 sin ajustar cada vez).
- Modo oscuro funcional (theming real, no solo el toggle visual).
- Notificación cruzada real ("tu pareja registró un gasto") — en el MVP se simplifica a un tag "nuevo" dentro del feed de Historial, sin sistema de push aparte.
- Hora del recordatorio de check-in configurable (MVP usa 8:00 p.m. fijo, ver §5.2).
- Expiración de código de invitación y flujo de re-emparejamiento / "romper pareja".
- Historial de cambios de reclasificación (quién cambió qué y cuándo).
- Módulos vistos en el research de referencia (Monedita) que se descartaron a propósito para este MVP: Gastos fijos/recurrentes, Flujo de caja, vista de Tarjetas independiente, Deudas fuera de la pareja. No están perdidos — son candidatos de v2, no un olvido.
- Plataforma BCRP "TAPP" de transferencias instantáneas (muy nueva a la fecha de este documento, set. 2026) — monitorear como fuente adicional de captura a futuro.

## 10. Referencia

Wireframe clickeable completo (onboarding, emparejamiento, y app de uso diario con datos de ejemplo): https://claude.ai/code/artifact/77ce7f10-d8b2-4c46-9f91-e3d212e27095
