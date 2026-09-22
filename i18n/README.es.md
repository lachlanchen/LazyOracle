[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![Banner de LazyOracle](../docs/images/banner.svg)

# LazyOracle

**Ocho prácticas adivinatorias, calculadas en tu propio dispositivo y explicadas en palabras sencillas.**

[Abrir la aplicación web](https://oracle.lazying.art) · [Espejo](https://oracle-fast.lazying.art) · [Beta en TestFlight](https://testflight.apple.com/join/JZJM3PFb) · [Prueba interna de Google Play](https://play.google.com/apps/internaltest/4701677916092886102) · [Privacidad](https://oracle.lazying.art/privacy.html) · [Soporte](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="Las ocho prácticas"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="Una tirada de tres cartas"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="Ask Tianji lanzando un hexagrama"></p>

El tarot, el BaZi, el I Ching, la astrología, el feng shui, la quiromancia y la lectura del rostro se apoyan, cada uno, en un cuerpo de reglas preciso, incluso allí donde no es ciencia. LazyOracle aplica esas reglas al pie de la letra, en el propio dispositivo, y después deja que un modelo de lenguaje convierta el resultado en frases. El modelo narra; nunca decide. La aplicación web es gratuita. Las aplicaciones para teléfono cuestan 0,99 US$ una sola vez, sin suscripción y sin gastos recurrentes, porque no hay nada que calcular en un servidor.

## Qué hace

- **Tarot** — las 78 cartas con palabras clave en inglés y en chino, tres tiradas y un barajado con semilla, de modo que cualquier tirada puede reproducirse a partir de la semilla que se imprime junto a ella.
- **BaZi (四柱八字)** — los cuatro pilares con sus tallos ocultos, los diez dioses, el nayin y los ciclos de suerte, a partir de la hora solar verdadera corregida por la longitud y por la ecuación del tiempo.
- **I Ching (周易)** — monedas o varillas de milenrama, líneas mutantes, el hexagrama resultante y los 互卦 (hexagrama nuclear), 错卦 (hexagrama opuesto) y 综卦 (hexagrama invertido), con la regla clásica sobre qué línea o qué dictamen responde realmente.
- **Astrología (星座)** — una carta natal calculada con una efeméride astronómica, casas de signo entero, ascendente y medio cielo, aspectos con sus orbes y los tránsitos de hoy.
- **Feng shui (风水)** — las Ocho Mansiones: tu 命卦 (trigrama de destino) y las ocho direcciones de una vivienda, con la brújula del teléfono para encontrarlas.
- **Quiromancia (手相)** — la mano se mide en el dispositivo a partir de una foto: la forma elemental de la mano, cada dedo comparado con el dedo corazón, el ángulo de apertura del pulgar y los ocho palacios de la palma.
- **Lectura del rostro (面相)** — los 三停 (las tres franjas del rostro), la proporción de los cinco ojos, la simetría, el tipo de rostro según los elementos y ocho de los 十二宫 (doce palacios), todo medido en el dispositivo.
- **El Libro de las Respuestas y el Libro de las Preguntas** — dos corpus originales, abiertos por una página que elige tu propia pregunta.
- **Ask Tianji (问天机)** — una conversación que puede ejecutar como herramienta cualquiera de los motores anteriores: saca cartas de verdad y lanza hexagramas de verdad, en lugar de describir lo que podrías hacer.

## Cómo se elabora una lectura

Cada práctica produce un conjunto estructurado de hechos: las cartas sacadas en sus posiciones, los pilares y sus relaciones, el hexagrama y sus líneas mutantes. Esos hechos los calcula código corriente y probado, así que son idénticos en todos los dispositivos y en todas las ejecuciones. Solo entonces se le pide prosa a un modelo, con esos hechos como única fuente y con la instrucción de no añadir, sustituir ni contradecir ninguno de ellos. Cuando no hay ningún modelo disponible, la propia aplicación compone la lectura a partir de los mismos hechos, de manera que siempre aparece una lectura.

Se intentan tres fuentes, en este orden:

| Fuente | Qué es | Cuándo se usa |
| --- | --- | --- |
| Un modelo Tianji descargado | 天机快速版 / Tianji Fast (unos 400 MB) o 天机专业版 / Tianji Pro (unos 1,1 GB), ejecutándose dentro de la aplicación mediante llama.cpp compilado a WebAssembly | Siempre que se haya descargado alguno |
| Tianji Cloud (天机云端) | Nuestro propio relé, que custodia la clave del proveedor y no conserva nada | Solo cuando se activa en Ajustes; desactivado por defecto |
| La composición sin conexión | El motor determinista redactando él mismo la lectura | Siempre que no haya ninguna de las anteriores |

## Privacidad

Las cartas, las cartas astrales, los hexagramas y las mediciones se calculan en el dispositivo. Las fotos para la quiromancia y la lectura del rostro se miden en memoria y nunca se guardan, ni se suben, ni se cotejan con nada. Los datos de nacimiento permanecen en el almacenamiento local del navegador, en ese dispositivo. No hay cuenta, ni analíticas, ni identificador publicitario. Con Tianji Cloud activado, una sola petición lleva los hechos estructurados y tu pregunta hasta nuestro relé, que los reenvía a un modelo de lenguaje y no guarda ninguna copia; con él desactivado, no sale absolutamente nada del dispositivo. La política completa está en [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html).

## Plataformas

| Plataforma | Implementación | Verificación |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Flujos en Chromium para cada práctica, precarga sin conexión y la ruta de código de Safari ejercitada con `tools/safari-path-test.py` |
| Android | Capacitor 8 | Bundle y APK firmados, instalados y ejecutados en la API 36 |
| iOS | Capacitor 8 | Archivo firmado y subido a App Store Connect, distribuido por TestFlight |

## Compilación y pruebas

Requisitos: Node.js 22+ y npm; Android Studio con JDK 21 para Android; Xcode para los objetivos de Apple.

```bash
npm install
npm run dev     # la PWA en http://localhost:5173
npm run check   # lint, 66 pruebas, compilación de producción
```

Dos comprobaciones de navegador se ejecutan contra un `dist/` ya compilado, con el Chromium de Playwright:

```bash
python3 tools/safari-path-test.py   # los modelos en el dispositivo siguen cargándose en Safari y en iOS
python3 tools/agent-chat-test.py    # el chat ejecuta de verdad los motores que dice ejecutar
```

## Estructura del repositorio

- `src/engines/` — una carpeta por práctica, funciones puras con pruebas y sin código de interfaz.
- `src/lib/` — la cadena de generación de lecturas, las fuentes de modelos, las herramientas del agente y las conversaciones guardadas.
- `src/components/` — una pantalla por práctica, más el chat y los ajustes.
- `ops/` — el relé de Tianji Cloud, en Python sin dependencias, con su unidad de systemd.
- `store/` — metadatos de las tiendas, declaraciones de privacidad, capturas y estado de publicación.
- `tools/` — scripts de publicación, despliegue y verificación en el navegador.
- `docs/` — el resumen de producto y el registro de avances, las notas de traspaso y los planes.

## Apoyo

Si este proyecto te resulta útil, una estrella, una incidencia, una traducción o una pull request bien acotada ayudan. El apoyo económico paga el alojamiento.

| Donar | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Apoyar con Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Patrocinar en GitHub](https://github.com/sponsors/lachlanchen)

## Acerca de

Creado por [Lachlan Chen](https://github.com/lachlanchen) en LazyingArt. Hermano de [L & N](https://github.com/lachlanchen/L-And-N), que aporta el armazón de la aplicación y la cadena de publicación.

Aquí la adivinación se entiende como un espejo para la reflexión, no como una predicción. Nada de lo que hay en esta aplicación constituye consejo médico, jurídico ni financiero.

Publicado bajo la [Licencia MIT](../LICENSE).
