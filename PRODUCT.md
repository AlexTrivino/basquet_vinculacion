# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Principal: aficionados y familias** de Manta que siguen los torneos: quieren saber cuándo y dónde juega su equipo, ver resultados y posiciones.
- **Secundarios:** delegados de equipo (inician sesión para inscribir a su equipo y cargar la nómina) y auspiciantes (quieren ver su marca respaldando el torneo).
- **Operación interna:** el super_admin de la organización gestiona torneos, partidos, inscripciones y sanciones desde el panel.

## Product Purpose

Plataforma oficial de los torneos de Torneos Baloncesto Manta, una comunidad de baloncesto de exalumnos de todo Manabí. Del lado público muestra torneos, calendario, resultados, tabla de posiciones, estadísticas y auspiciantes; del lado privado gestiona inscripciones (wizard), validación de documentos y nóminas, partidos, estadísticas FIBA y sanciones. Éxito: que el aficionado encuentre su próximo partido o el último resultado en segundos, y que un delegado sepa cómo inscribir a su equipo.

## Positioning

Una comunidad de baloncesto nacida en Manta que reúne a exalumnos de todo Manabí para convivir y conectar a través de una misma pasión. Sus torneos, organizados desde 2019 y jugados en el Coliseo Pablo Delgado Álava, reactivaron el baloncesto de la ciudad. Todo lo que muestra el sitio (calendario, marcadores, posiciones, equipos) son datos reales de esos torneos.

## Operating Context

- Partidos en el Coliseo Pablo Delgado Álava, Manta, Ecuador.
- Competencias por categorías de edad y género; tabla de posiciones con puntuación FIBA.
- Los delegados inscriben equipos después de iniciar sesión; el registro de cuenta es público.
- Contacto: el botón flotante de WhatsApp es el único canal de contacto del sitio; ningún número se muestra en pantalla. Redes: Instagram (instagram.com/baloncestomanta) y Facebook, como íconos en el footer.
- La plataforma está en producción con datos reales (Supabase).

## Capabilities and Constraints

- Stack existente: React 19 + Vite + Tailwind v4 + React Query (frontend), Flask 3.1 + SQLAlchemy (backend), Supabase (Postgres, Auth, Storage).
- Idioma: español.
- API pública para torneos, partidos, equipos y patrocinadores; los partidos no se filtran por fecha en el API.
- Roles: `super_admin` y `delegado`.

## Brand Commitments

- Nombre: **Torneos Baloncesto Manta**.
- Logo oficial: `logo_baloncestoManta.png` (recorte web en `frontend/public/img/logo-recortado.webp`).
- Lo que el usuario rechaza: que el sitio parezca una plantilla genérica.
- El sitio no incluye créditos académicos ni institucionales, ni nombra a instituciones educativas u organizaciones externas (pedido del usuario).

## Evidence on Hand

- Datos reales en producción: torneos, categorías, equipos con logo, partidos con marcador y auspiciantes con logo.
- Foto del coliseo aportada por el usuario: `frontend/public/img/hero-coliseo.jpg`.
- Balón de baloncesto 3D aportado por el usuario (GLB generado con Tripo), optimizado en `frontend/public/models/balon.glb`.
- Ausencias que no se deben inventar: no hay correo de contacto ni teléfono visible; no hay testimonios, prensa ni cifras de asistencia.

## Product Principles

1. **Datos, no promesas:** cada cifra y cada partido en el sitio público viene del API; nada inventado.
2. **El aficionado primero:** próximos partidos y resultados siempre a un toque.
3. **Identidad de Manta:** la ciudad, el coliseo y el organizador están visibles; no es una liga genérica.
4. **Un camino claro para el delegado:** inscribir un equipo empieza en el login, sin rodeos.
