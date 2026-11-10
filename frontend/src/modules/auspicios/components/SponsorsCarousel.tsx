import { useQuery } from '@tanstack/react-query';
import { getPatrocinadores } from '../api/patrocinadores.api';

// Cada logo va en blanco sobre su propia ficha marino; sin auspiciantes queda un aviso breve
export function SponsorsCarousel() {
  const { data: patrocinadores = [], isLoading } = useQuery({
    queryKey: ['patrocinadores-publico'],
    queryFn: getPatrocinadores,
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  if (isLoading) return null;
  if (!patrocinadores || patrocinadores.length === 0) {
    return <p className="text-slate-400">Pronto anunciaremos a los auspiciantes de esta temporada.</p>;
  }

  // Cuadruplicamos la lista para asegurar que el carrusel CSS fluya bien en pantallas ultra anchas
  const ALL_SPONSORS = [...patrocinadores, ...patrocinadores, ...patrocinadores, ...patrocinadores];

  return (
    // py-4: deja ver la sombra de las fichas, que overflow-hidden recortaría
    <div className="overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="animate-marquee flex w-max items-center">
        {ALL_SPONSORS.map((sponsor, i) => {
          // Solo la primera vuelta se anuncia; las copias son relleno visual
          const copia = i >= patrocinadores.length;
          return (
            <div
              key={`${sponsor.id_patrocinador}-${i}`}
              aria-hidden={copia || undefined}
              className="mx-5 flex h-24 w-44 items-center justify-center rounded-xl border border-oro/30 bg-marino-claro px-5 py-3 shadow-lg shadow-black/40"
            >
              {/* Gris e invertido, el logo queda claro sobre negro; screen vuelve ese negro el marino de la ficha.
                  Un logo con fondo oscuro se vería como un recuadro claro: por eso el admin pide fondo blanco o transparente */}
              <img
                src={sponsor.url_logo_patrocinador || ''}
                alt={copia ? '' : sponsor.nombre_patrocinador}
                className="h-full w-full object-contain mix-blend-screen grayscale invert"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
