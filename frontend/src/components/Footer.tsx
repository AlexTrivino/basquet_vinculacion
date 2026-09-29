import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { getTorneos } from '../features/torneos/api/torneos.api';

// ponytail: sin correo ni redes sociales todavía; se agregan aquí cuando existan
const CONTACTO = {
  direccion: 'Coliseo Pablo Delgado Álava, Manta, Ecuador',
  telefono: '+593 98 962 9870',
  whatsapp: '593989629870', // solo dígitos con código de país
};
const ENLACE_WHATSAPP = `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent('Hola, quiero información sobre los torneos.')}`;

// Los enlaces con '#' son anclas de la página de inicio (el footer solo vive ahí)
const NAVEGACION = [
  { texto: 'Inicio', href: '#inicio' },
  { texto: 'Auspiciantes', href: '#auspiciantes' },
  { texto: 'Conócenos', href: '#conocenos' },
  { texto: 'Partidos', href: '#partidos' },
  { texto: 'Equipos', href: '/equipos' },
  { texto: 'Iniciar sesión', href: '/auth/login' },
];

// Móvil y tablet: el título despliega su lista (acordeón centrado). Desde lg: columna abierta de siempre.
function Columna({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  return (
    <div className="border-t border-white/10 lg:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={() => setAbierta((a) => !a)}
          className="flex w-full items-center justify-center gap-2 py-5 text-sm font-bold uppercase tracking-[0.2em] text-white lg:pointer-events-none lg:block lg:w-auto lg:py-0 lg:text-left"
        >
          <span>
            {titulo}
            <span aria-hidden="true" className="mx-auto mt-2 block h-0.5 w-8 bg-oro lg:mx-0" />
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 text-oro transition-transform duration-300 lg:hidden ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      <div id={id} className={`${abierta ? 'block' : 'hidden'} pb-6 lg:mt-6 lg:block lg:pb-0`}>
        {children}
      </div>
    </div>
  );
}

function FilaContacto({ icono: Icono, children }: { icono: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start justify-center gap-3 lg:justify-start">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-oro/40 text-oro">
        <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="pt-0.5 text-left">{children}</span>
    </li>
  );
}

export function Footer() {
  const { data } = useQuery({ queryKey: ['torneos', 'public', 'todos'], queryFn: () => getTorneos(1, 50) });
  const torneos = (data?.data ?? []).slice(0, 6);
  const anio = new Date().getFullYear();

  return (
    <footer id="contacto" className="relative z-10 bg-[#16181D] text-slate-300">
      <div className="mx-auto grid max-w-6xl px-4 py-16 text-center sm:px-6 lg:grid-cols-4 lg:gap-12 lg:px-8 lg:text-left">
        <div className="pb-10 lg:pb-0">
          <img src="/img/logo-recortado.webp" alt="Torneos Baloncesto Manta" className="mx-auto h-24 w-auto lg:mx-0" />
          <span aria-hidden="true" className="mx-auto my-6 block h-px w-full max-w-[15rem] bg-oro/50 lg:mx-0" />
          <p className="mx-auto max-w-sm text-sm leading-relaxed lg:mx-0">
            Una comunidad de baloncesto que reúne a exalumnos de todo Manabí. Desde 2019 reactivando el baloncesto de Manta.
          </p>
        </div>

        <nav aria-label="Torneos">
          <Columna titulo="Torneos">
            <ul className="space-y-3 text-sm">
              {torneos.map((t) => (
                <li key={t.id_torneo ?? t.id}>
                  <Link to={`/torneos/${t.id_torneo ?? t.id}`} className="transition-colors hover:text-white">
                    {t.nombre || t.nombre_torneo}
                  </Link>
                </li>
              ))}
            </ul>
          </Columna>
        </nav>

        <nav aria-label="Navegación">
          <Columna titulo="Navegación">
            <ul className="space-y-3 text-sm">
              {NAVEGACION.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith('#') ? (
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.texto}
                    </a>
                  ) : (
                    <Link to={item.href} className="transition-colors hover:text-white">
                      {item.texto}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Columna>
        </nav>

        <div className="border-b border-white/10 lg:border-0">
          <Columna titulo="Contacto">
            <ul className="space-y-4 text-sm">
              <FilaContacto icono={MapPin}>{CONTACTO.direccion}</FilaContacto>
              <FilaContacto icono={Phone}>
                <a
                  href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`}
                  className="tabular-nums transition-colors hover:text-white"
                >
                  {CONTACTO.telefono}
                </a>
              </FilaContacto>
              <FilaContacto icono={MessageCircle}>
                <a
                  href={ENLACE_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Escríbenos por WhatsApp
                </a>
              </FilaContacto>
            </ul>
          </Columna>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t border-white/10 px-4 py-6 text-center text-xs text-slate-400 sm:px-6 lg:px-8 lg:text-left">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p>© {anio} Torneos Baloncesto Manta. Todos los derechos reservados.</p>
        </div>
        <p className="mt-4 flex flex-col gap-1 lg:flex-row lg:gap-0">
          <span>{CONTACTO.direccion}</span>
          <span aria-hidden="true" className="hidden lg:inline">
            &nbsp;·&nbsp;
          </span>
          <span className="whitespace-nowrap tabular-nums">{CONTACTO.telefono}</span>
        </p>
      </div>

      <a
        href={ENLACE_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40 transition-transform hover:scale-105"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
    </footer>
  );
}
