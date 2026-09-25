import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTorneos } from '../torneos/api/torneos.api';
import { getEquipos } from '../equipos/api/equipos.api';
import { getPartidos } from '../partidos/api/partidos.api';

// "1 torneo" / "3 torneos": la cifra en negrita y el resto en texto corrido
function Cifra({ valor, singular, plural }: { valor: number; singular: string; plural: string }) {
  return (
    <>
      <strong className="font-semibold tabular-nums text-crema">{valor}</strong> {valor === 1 ? singular : plural}
    </>
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
            Exalumnos Salesianos de Manta
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            Desde 2019 organizamos los torneos que reactivaron el baloncesto en Manta. Reunimos a clubes, exalumnos y
            nuevas generaciones en competencias por categorías de edad y género.
          </p>
          <p className="mt-4 leading-relaxed text-slate-400">
            Cada temporada tiene calendario oficial, tabla de posiciones con el sistema de puntuación FIBA y estadísticas
            de cada jugador, todo en esta plataforma desarrollada junto a la ULEAM como proyecto de vinculación.
          </p>
          {totalTorneos !== undefined && totalEquipos !== undefined && totalPartidos !== undefined && (
            <p className="mt-6 leading-relaxed text-slate-300">
              Hasta hoy: <Cifra valor={totalTorneos} singular="torneo" plural="torneos" />,{' '}
              <Cifra valor={totalEquipos} singular="equipo" plural="equipos" /> y{' '}
              <Cifra valor={totalPartidos} singular="partido jugado" plural="partidos jugados" />.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
