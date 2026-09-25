---
name: design-md
description: Catálogo de 74 DESIGN.md de marcas reales (VoltAgent/awesome-design-md). Úsala cuando pidan "usa el estilo de X", "aplica un DESIGN.md", "qué estilos hay", o antes de rediseñar pantallas tomando una marca como referencia visual.
---

# DESIGN.md — catálogo awesome-design-md

74 sistemas de diseño en formato DESIGN.md (Google Stitch): paleta con roles, tipografía, componentes, layout, elevación, do's/don'ts, responsive y prompts listos.
Fuente: https://github.com/VoltAgent/awesome-design-md (MIT), snapshot `f696123 2026-09-21`. Cada archivo vive en `catalog/<slug>/DESIGN.md`.

## Estado en este proyecto

**Ninguno está activo**: no hay `DESIGN.md` en la raíz (decisión del usuario). Mientras tanto manda la identidad actual de `.agents/AGENTS.md`: shell neutro institucional + colores dinámicos por torneo (`--torneo-primary`, `--torneo-accent` en `frontend/src/index.css`).

## Cómo aplicar uno

1. Elige el slug en el índice (o `ls catalog/`) y **confírmalo con el usuario**: cambia la dirección visual de todo el frontend, que ya está en producción.
2. Copia `catalog/<slug>/DESIGN.md` a la raíz del repo como `DESIGN.md`. Si ya existe uno, pregunta antes de sobrescribir.
3. Antes de tocar UI, lee `DESIGN.md` y traduce sus tokens al `@theme` de Tailwind v4 en `frontend/src/index.css`; no copies CSS del sitio original.
4. El DESIGN.md gobierna el shell (Navbar, auth, admin). Las vistas `/torneos/:id` conservan sus colores dinámicos por torneo.

Versión más reciente de un estilo (necesita red): `npx getdesign@latest add <slug>`.
Con impeccable: `/impeccable document` genera un DESIGN.md a partir del código actual. Usa una sola fuente de verdad, no ambas.

## Índice

| slug | estilo |
|---|---|
| `airbnb` | **Airbnb** — Travel marketplace. Warm coral accent, photography-driven, rounded UI |
| `airtable` | **Airtable** — Spreadsheet-database hybrid. Colorful, friendly, structured data aesthetic |
| `apple` | **Apple** — Consumer electronics. Premium white space, SF Pro, cinematic imagery |
| `binance` | **Binance** — Crypto exchange. Bold Binance Yellow on monochrome, trading-floor urgency |
| `bmw` | **BMW** — Luxury automotive. Dark premium surfaces, precise German engineering aesthetic |
| `bmw-m` | **BMW M** — Performance automotive. Motorsport-inspired contrast, M color accents, precision-driven layout |
| `bugatti` | **Bugatti** — Luxury hypercar. Cinema-black canvas, monochrome austerity, monumental display type |
| `cal` | **Cal.com** — Open-source scheduling. Clean neutral UI, developer-oriented simplicity |
| `claude` | **Claude** — Anthropic's AI assistant. Warm terracotta accent, clean editorial layout |
| `clay` | **Clay** — Creative agency. Organic shapes, soft gradients, art-directed layout |
| `clickhouse` | **ClickHouse** — Fast analytics database. Yellow-accented, technical documentation style |
| `cohere` | **Cohere** — Enterprise AI platform. Vibrant gradients, data-rich dashboard aesthetic |
| `coinbase` | **Coinbase** — Crypto exchange. Clean blue identity, trust-focused, institutional feel |
| `composio` | **Composio** — Tool integration platform. Modern dark with colorful integration icons |
| `cursor` | **Cursor** — AI-first code editor. Sleek dark interface, gradient accents |
| `dell-1996` | **Dell (1996)** — Catalog-era enterprise web. Literal black page frame, flat color-block "ribbon cards", chunky Helvetica-Black titles over Times Roman body, and hand-cut GIF stickers (NEW! bursts, award seals, beveled product photos). |
| `elevenlabs` | **ElevenLabs** — AI voice platform. Dark cinematic UI, audio-waveform aesthetics |
| `expo` | **Expo** — React Native platform. Dark theme, tight letter-spacing, code-centric |
| `ferrari` | **Ferrari** — Luxury automotive. Chiaroscuro black-white editorial, Ferrari Red with extreme sparseness |
| `figma` | **Figma** — Collaborative design tool. Vibrant multi-color, playful yet professional |
| `framer` | **Framer** — Website builder. Bold black and blue, motion-first, design-forward |
| `hashicorp` | **HashiCorp** — Infrastructure automation. Enterprise-clean, black and white |
| `hp` | **HP** — PC and printer maker. Pure white canvas, HP Electric Blue signal CTA, geometric Forma DJR Micro, blue chevron decorations |
| `ibm` | **IBM** — Enterprise technology. Carbon design system, structured blue palette |
| `intercom` | **Intercom** — Customer messaging. Friendly blue palette, conversational UI patterns |
| `kraken` | **Kraken** — Crypto trading platform. Purple-accented dark UI, data-dense dashboards |
| `lamborghini` | **Lamborghini** — Luxury automotive. True black cathedral, gold accent, LamboType custom Neo-Grotesk |
| `linear.app` | **Linear** — Project management for engineers. Ultra-minimal, precise, purple accent |
| `lovable` | **Lovable** — AI full-stack builder. Playful gradients, friendly dev aesthetic |
| `mastercard` | **Mastercard** — Global payments network. Warm cream canvas, orbital pill shapes, editorial warmth |
| `meta` | **Meta** — Tech retail store. Photography-first, binary light/dark surfaces, Meta Blue CTAs |
| `minimax` | **Minimax** — AI model provider. Bold dark interface with neon accents |
| `mintlify` | **Mintlify** — Documentation platform. Clean, green-accented, reading-optimized |
| `miro` | **Miro** — Visual collaboration. Bright yellow accent, infinite canvas aesthetic |
| `mistral.ai` | **Mistral AI** — Open-weight LLM provider. French-engineered minimalism, purple-toned |
| `mongodb` | **MongoDB** — Document database. Green leaf branding, developer documentation focus |
| `nike` | **Nike** — Athletic retail. Monochrome UI, massive uppercase Futura, full-bleed photography |
| `nintendo-2001` | **Nintendo.com (2001)** — Y2K "console chrome" web. Brushed-periwinkle beveled metal panels, a halftone-dotted carbon nav glowing amber, outlined Arial-Black box-art wordmarks over circuit-board hero fields, and a pixel Mario welcome bubble. |
| `notion` | **Notion** — All-in-one workspace. Warm minimalism, serif headings, soft surfaces |
| `nvidia` | **NVIDIA** — GPU computing. Green-black energy, technical power aesthetic |
| `ollama` | **Ollama** — Run LLMs locally. Terminal-first, monochrome simplicity |
| `opencode.ai` | **OpenCode AI** — AI coding platform. Developer-centric dark theme |
| `pinterest` | **Pinterest** — Visual discovery platform. Red accent, masonry grid, image-first |
| `playstation` | **PlayStation** — Gaming console retail. Three-surface channel layout, cyan hover-scale interaction |
| `posthog` | **PostHog** — Product analytics. Playful hedgehog branding, developer-friendly dark UI |
| `raycast` | **Raycast** — Productivity launcher. Sleek dark chrome, vibrant gradient accents |
| `renault` | **Renault** — French automotive. Vivid aurora gradients, NouvelR proprietary typeface, zero-radius buttons |
| `replicate` | **Replicate** — Run ML models via API. Clean white canvas, code-forward |
| `resend` | **Resend** — Email API for developers. Minimal dark theme, monospace accents |
| `revolut` | **Revolut** — Digital banking. Sleek dark interface, gradient cards, fintech precision |
| `runwayml` | **Runway** — AI creative-tools platform with an editorial film-festival aesthetic — cinematic dark heroes, paper-white reading bands, single proprietary sans, and pure black pill CTAs. |
| `sanity` | **Sanity** — Headless content platform with a dark-first editorial marketing surface — 112px display type, IBM Plex Mono technical eyebrows, and a single coral-red accent reserved for the highest-priority CTA. |
| `sentry` | **Sentry** — Error monitoring. Dark dashboard, data-dense, pink-purple accent |
| `shopify` | **Shopify** — E-commerce platform. Dark-first cinematic, neon green accent, ultra-light display type |
| `slack` | (sin descripción en el README) |
| `spacex` | **SpaceX** — Space technology. Stark black and white, full-bleed imagery, futuristic |
| `spotify` | **Spotify** — Music streaming. Vibrant green on dark, bold type, album-art-driven |
| `starbucks` | **Starbucks** — Coffee retail flagship. Four-tier earth-green system, warm cream canvas, proprietary SoDoSans typography |
| `stripe` | **Stripe** — Payment infrastructure. Signature purple gradients, weight-300 elegance |
| `supabase` | **Supabase** — Open-source Firebase alternative. Dark emerald theme, code-first |
| `superhuman` | **Superhuman** — Fast email client. Premium dark UI, keyboard-first, purple glow |
| `tesla` | **Tesla** — Electric vehicles. Radical subtraction, cinematic full-viewport photography, Universal Sans |
| `theverge` | **The Verge** — Tech editorial media. Acid-mint and ultraviolet accents, Manuka display type |
| `together.ai` | **Together AI** — Open-source AI infrastructure. Technical, blueprint-style design |
| `uber` | **Uber** — Mobility platform. Bold black and white, tight type, urban energy |
| `vercel` | **Vercel** — Frontend deployment platform. Black and white precision, Geist font |
| `vodafone` | **Vodafone** — Global telecom brand. Monumental uppercase display, Vodafone Red chapter bands |
| `voltagent` | **VoltAgent** — AI agent framework. Void-black canvas, emerald accent, terminal-native |
| `warp` | **Warp** — Modern terminal. Dark IDE-like interface, block-based command UI |
| `webflow` | **Webflow** — Visual web builder. Blue-accented, polished marketing site aesthetic |
| `wired` | **WIRED** — Tech magazine. Paper-white broadsheet density, custom serif, ink-blue links |
| `wise` | **Wise** — International money transfer. Bright green accent, friendly and clear |
| `x.ai` | **xAI** — Elon Musk's AI lab. Stark monochrome, futuristic minimalism |
| `zapier` | **Zapier** — Automation platform. Warm orange, friendly illustration-driven |
