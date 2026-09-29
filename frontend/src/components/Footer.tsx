import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { getTorneos } from '../features/torneos/api/torneos.api';
import { IconoMarca, REDES } from './Contacto';

// Sin teléfono ni correo en pantalla: el único contacto es el botón flotante de WhatsApp (MainLayout)
const DIRECCION = 'Coliseo Pablo Delgado Álava, Manta, Ecuador';

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
          <Columna titulo="Síguenos">
            <ul className="flex justify-center gap-3 lg:justify-start">
              {REDES.map((red) => (
                <li key={red.nombre}>
                  <a
                    href={red.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${red.texto} de Torneos Baloncesto Manta`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-oro/40 text-oro transition-colors hover:border-oro hover:bg-oro hover:text-marino"
                  >
                    <IconoMarca nombre={red.nombre} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start justify-center gap-2 text-sm lg:justify-start">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-oro" aria-hidden="true" />
              <span className="text-left">{DIRECCION}</span>
            </p>
          </Columna>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t border-white/10 px-4 pb-28 pt-6 text-center text-xs lg:pb-6 text-slate-400 sm:px-6 lg:px-8 lg:text-left">
        <p>© {anio} Torneos Baloncesto Manta. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
