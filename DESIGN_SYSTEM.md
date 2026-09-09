# Ambos — Tokens de diseño

Esto **no es un design system formal** (no hay componentes documentados por estado, ni una librería en Figma). Es la extracción honesta de lo que ya se usó de forma consistente en el wireframe, para que quien programe no reinvente colores ni tipografía a ojo. Referencia visual: https://claude.ai/code/artifact/77ce7f10-d8b2-4c46-9f91-e3d212e27095

---

## 1. Color

### Base

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#FFFBF2` | Fondo de toda la app (cálido, no blanco puro) |
| `surface` | `#FFFFFF` | Cards, inputs, chips sin seleccionar |
| `surface-muted` | `#F5F0E4` | Pills secundarios, fondo del input de chat |
| `border` | `#F0EADA` | Borde de cards y separadores |
| `ink` | `#3A2A1E` | Texto primario |
| `ink-muted` | `#8A7A63` | Texto secundario (metadatos, subtítulos) |
| `ink-muted-2` | `#6B5D48` | Texto secundario sobre fondo claro con más contraste (links, chips sin seleccionar) |
| `ink-disabled` | `#B8AA92` | Iconos/labels inactivos (nav sin seleccionar) |

### Acento

| Token | Hex | Uso |
|---|---|---|
| `accent` (coral) | `#E2653C` | Acción primaria — botones, elementos activos, racha, color de "Tú" |
| `accent-gold` | `#F0B429` | Racha/badge de hábito, progreso de ciclo |
| `pareja` (teal) | `#3D7A8C` | Color de identidad de "Tu pareja" — persona, no estado |
| `positivo` | `#3D8C77` | Estados de éxito (comprobante guardado, ciclo liquidado). **Nota:** el checkmark de confirmación usa `#2F8F5B`, ligeramente distinto — unificar a uno solo en el build real. |

### Tintes (fondos suaves, para pills y banners)

| Token | Hex | Uso |
|---|---|---|
| `tint-coral` | `#FDEBE3` | Badge "nuevo", saldo a favor |
| `tint-gold` | `#FBF2E2` | Banner de día de gracia |
| `tint-green` | `#E9F6EE` / `#EAF3EF` | Estados positivos, saldo en cero |
| `tint-teal` | `#E7F0F2` | Saldo en contra |

### Categorías (paleta validada contra daltonismo)

Orden fijo — **nunca reasignar el color de una categoría según su posición o monto**, el color identifica la categoría siempre:

| Categoría | Hex |
|---|---|
| Comida | `#2a78d6` |
| Salidas | `#eb6834` |
| Transporte | `#1baf7a` |
| Compras | `#eda100` |

Validado con el validador de paletas del skill de dataviz: pasa separación CVD (ΔE ≥ 8) y contraste normal-vision (ΔE ≥ 15) en orden adyacente, sobre fondo `#FFFBF2`. Si se agrega una 5ta categoría, no inventar un color — re-correr el validador.

---

## 2. Tipografía

| Rol | Fuente | Dónde |
|---|---|---|
| Display / títulos | `Architects Daughter` (Google Fonts, manuscrita) | Títulos de pantalla, preguntas del check-in, texto de la mascota, wordmark "Ambos" |
| UI / cuerpo | `IBM Plex Sans` (400/500/600/700) | Todo lo demás: labels, botones, montos, listas |

- Los montos usan `font-variant-numeric: tabular-nums` para que los números alineen en columna.
- La fuente manuscrita es la personalidad de la marca — no meterla en botones ni en datos, solo en momentos de "voz" (preguntas, mascota, títulos de sección).

## 3. Radios y espaciado

| Elemento | Radio |
|---|---|
| Cards | 16–18px |
| Botones primarios | 22px |
| Chips / pills / badges | 999px (full) |
| Inputs / campos | 16px |

Gaps entre elementos: 6–10px (elementos relacionados dentro de un componente), 12–20px (entre bloques/secciones). Sin escala numerada formal — se usó a criterio, consistente pero no tokenizado.

## 4. Componentes recurrentes

### Botón primario
Fondo `accent`, texto `#FFFBF2`, radio 22px, sombra sutil `0 4px 0 rgba(0,0,0,.12)` (efecto "presionable", no elevación de sistema).

### Botón secundario / "no"
Fondo `surface`, borde 2px `border`, texto `ink`, sin sombra.

### Chip de selección (Personal / Pareja / categoría / medio de pago)
- Sin seleccionar: fondo `surface`, borde 2px del color de identidad (neutro para "Personal", `accent` en tono suave para "Pareja" — la identidad se ve **incluso sin seleccionar**, es lo que evita que se confunda con "estoy viendo el correo del otro").
- Seleccionado: fondo sólido del color de identidad, texto `#FFFBF2`.
- Siempre con ícono + texto, nunca solo color (accesibilidad + claridad).

### Card
Fondo `surface`, borde 2px `border`, radio 16–18px, padding 13–16px.

### Badge/pill de estado
Fondo tinte suave del color correspondiente, texto en el color sólido, radio full, padding chico (`3–5px 9–12px`).

### Barra de progreso / balance
Track `#F0EADA`, relleno del color de estado, marcador circular con borde blanco de 3px y sombra sutil.

### Overlay / modal
Fondo opaco `bg` completo (no semitransparente) cubriendo toda la pantalla, header fijo con título + botón cerrar (X en círculo `surface-muted`), contenido con scroll.

### Fondo oscurecido detrás de tooltips
`rgba(58,42,30,.5)` + `backdrop-filter: blur(3px)` — para tooltips guiados sobre contenido, no para modales de flujo (esos usan el overlay opaco de arriba).

## 5. Iconografía

- **Nunca emoji ni dingbats.** Todo ícono es SVG inline, trazo (`stroke`), sin relleno salvo casos puntuales (mascota, checkmark de confirmación).
- Grosor de trazo: 2–2.6px según tamaño del ícono.
- Color dinámico: siempre vía `stroke="currentColor"` + `color` heredado del contenedor — nunca un color crudo metido directo en el SVG cuando debe cambiar con el estado.

## 6. Personajes ilustrados

A diferencia del resto del wireframe (formas planas, CSS), estos son **assets de imagen ilustrados** (generados, estilo flat-chibi con línea café cálida y sombreado suave, fondo `#FFFBF2`), no SVG. Archivos finales en `assets/` del repo — mismos nombres que en el canvas:

### Perrito de racha (`dog-neutral.jpg`, `dog-happy.jpg`, `dog-worried.jpg`)

Vive únicamente en el flujo del **check-in diario / racha** — no es la mascota genérica de toda la app:

| Estado | Cuándo | Uso |
|---|---|---|
| Neutral | Antes de responder el check-in del día | Pantalla de check-in, bienvenida de onboarding |
| Feliz | *(generado, aún sin usar en el wireframe — disponible para un futuro "racha completada")* | — |
| Preocupado | Después de tocar "Hoy no" | Pantalla de check-in declinado |

Tono de marca: cambia de ánimo con la racha, pero sin alarma ni culpa — decepción leve, nunca angustia (ver principios de gamificación en el PRD, §3, y la discusión explícita sobre por qué NO copiamos el mecanismo de pérdida de Duolingo tal cual).

### Moneda (`coin.jpg`)

Personaje separado, mismo ADN visual (línea café, pañuelo coral) pero cuerpo de moneda gruesa acanalada. Aparece específicamente cuando la app pregunta algo sobre **clasificar dinero**: el chat de registro manual y la pregunta "¿Fue personal o de los dos?". No se usa para racha ni para nada fuera de ese contexto — es el personaje-guía de decisiones de plata, el perrito es el de constancia diaria.

### Avatares de pareja (`boy-bust.jpg`, `girl-bust.jpg`, `hug.jpg`)

Mismo estilo ilustrado, pensados para **fotos de perfil reales** por género (elegido en onboarding — MVP solo maneja hombre/mujer, sin tercera opción neutral todavía):
- `boy-bust.jpg` / `girl-bust.jpg`: recorte busto, para el avatar circular del header y los avatares de "Conectados" en onboarding.
- `hug.jpg`: escena de ambos personajes abrazándose, usada en la pantalla de "¡Ajustado!" al liquidar un ciclo.

**Nota abierta:** `hug.jpg` incluye una copa de vino en la mano de uno de los personajes que nadie pidió explícitamente (efecto secundario de la generación) — se dejó así a propósito por ahora; si se quiere quitar hay que regenerar la imagen en Gemini, no es editable en código.

**Importante para Dev:** como son fotos (color + sombreado), **no se pueden teñir dinámicamente** vía `currentColor` como los íconos de línea — el color de identidad (coral="Tú"/teal="Pareja") se sigue mostrando aparte del avatar (nombre, punto de color), nunca recoloreando la imagen.

## 7. Qué falta para ser un design system real

Esto es honesto sobre sus límites — si en algún punto el equipo crece o hay más de un diseñador construyendo en paralelo, falta:
- Estados de componente documentados (hover, disabled, error, loading) — el wireframe casi no tiene loading/error states.
- Escala de espaciado numerada (hoy es "a ojo pero consistente").
- Tokens en modo oscuro (el toggle existe pero no cambia nada real).
- Componentes como archivos reutilizables (hoy cada pantalla repite el CSS).
- Los personajes ilustrados (§6) no tienen tratamiento para modo oscuro — son fotos con fondo crema fijo, se verían con un recuadro claro sobre un fondo oscuro real.
- `dog-happy.jpg` existe como asset aprobado pero no está conectado a ningún estado real todavía (ver §6).

Para el MVP de 2 personas, no bloquea nada — es la lista de lo que se posterga a propósito.
