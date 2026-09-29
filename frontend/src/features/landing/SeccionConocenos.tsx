import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTorneos } from '../torneos/api/torneos.api';
import { getEquipos } from '../equipos/api/equipos.api';
import { getPartidos } from '../partidos/api/partidos.api';
import { getEstadisticasPublicas } from '../estadisticas/api/estadisticas.api';

// "1 torneo" / "3 torneos": la cifra en negrita y el resto en texto corrido
function Cifra({ valor, singular, plural }: { valor: number; singular: string; plural: string }) {
  return (
    <>
      <strong className="cifra-brillo font-bold tabular-nums text-oro">{valor}</strong> {valor === 1 ? singular : plural}
    </>
  );
}

const formato = new Intl.NumberFormat('es-EC');

// Cuenta de 0 al total cuando entra en pantalla. Escribe en el DOM (no en estado de React) para no
// re-renderizar en cada cuadro. Sin IntersectionObserver o con "reducir movimiento" muestra el total directo.
function ContadorPuntos({ total }: { total: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const reducir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reducir || typeof IntersectionObserver === 'undefined') return;
    let cuadro = 0;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        obs.disconnect();
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const t = Math.min(1, (ahora - inicio) / 1600);
          el.textContent = formato.format(Math.round(total * (1 - Math.pow(1 - t, 3)))); // desacelera al final
          if (t < 1) cuadro = requestAnimationFrame(paso);
        };
        cuadro = requestAnimationFrame(paso);
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, [total]);

  return (
    <div className="mt-8">
      <p className="font-display text-5xl font-bold leading-none sm:text-6xl">
        <span ref={ref} aria-hidden="true" className="cifra-brillo tabular-nums text-oro">
          {formato.format(total)}
        </span>
        <span className="sr-only">{formato.format(total)} puntos anotados hasta ahora</span>
      </p>
      <p aria-hidden="true" className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Puntos anotados hasta ahora
      </p>
    </div>
  );
}

export function SeccionConocenos() {
  // El web component 3D se descarga solo cuando esta sección se monta
  useEffect(() => {
    void import('@google/model-viewer');
  }, []);
  // Con "reducir movimiento" el balón no gira (el rebote ya lo apaga el CSS)
  const reducirMovimiento =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const torneos = useQuery({ queryKey: ['torneos', 'public', 'todos'], queryFn: () => getTorneos(1, 50) });
  const equipos = useQuery({ queryKey: ['landing', 'total-equipos'], queryFn: () => getEquipos(1, 1) });
  const partidos = useQuery({
    queryKey: ['landing', 'total-partidos-jugados'],
    queryFn: () => getPartidos({ estados: 'finalizado,finalizado_wo', per_page: 1 }),
  });
  const estadisticas = useQuery({ queryKey: ['landing', 'estadisticas-publicas'], queryFn: getEstadisticasPublicas });
  const puntosTotales = estadisticas.data?.data?.puntos_totales;
  const totalTorneos = torneos.data?.pagination?.total ?? torneos.data?.data?.length;
  const totalEquipos = equipos.data?.pagination?.total;
  const totalPartidos = partidos.data?.pagination?.total;

  return (
    <section id="conocenos" className="relative z-10 scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        {/* Balón 3D rebotando */}
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div
            aria-hidden="true"
            className="sombra-rebote absolute inset-x-[26%] bottom-[4%] h-[6%] rounded-[50%] bg-black/70 blur-md"
          />
          <div className="balon-rebote absolute inset-x-0 bottom-[7%] h-[78%]">
            <model-viewer
              src="/models/balon.glb"
              alt="Balón de baloncesto en 3D"
              {...(reducirMovimiento ? {} : { 'auto-rotate': true })}
              rotation-per-second="35deg"
              interaction-prompt="none"
              camera-orbit="0deg 75deg auto"
              environment-image="neutral"
              exposure="1.1"
              loading="lazy"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-balance font-display text-3xl font-bold leading-tight text-crema sm:text-5xl">
            Llevando el deporte en la sangre
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            Somos una comunidad de baloncesto nacida en Manta con un objetivo: reunir a exalumnos de todo Manabí para
            convivir y conectar a través de una misma pasión.
          </p>
          <p className="mt-4 leading-relaxed text-slate-400">
            Cada torneo es un punto de encuentro: compañeros de colegio que vuelven a verse, rivales que terminan siendo
            amigos y nuevas generaciones que se suman al juego. Aquí sigues el calendario, las posiciones y las
            estadísticas de cada temporada.
          </p>
          {totalTorneos !== undefined && totalEquipos !== undefined && totalPartidos !== undefined && (
            <p className="mt-6 leading-relaxed text-slate-300">
              Hasta hoy: <Cifra valor={totalTorneos} singular="torneo" plural="torneos" />,{' '}
              <Cifra valor={totalEquipos} singular="equipo" plural="equipos" /> y{' '}
              <Cifra valor={totalPartidos} singular="partido jugado" plural="partidos jugados" />.
            </p>
          )}
          {puntosTotales !== undefined && <ContadorPuntos total={puntosTotales} />}
        </div>
      </div>
    </section>
  );
}
