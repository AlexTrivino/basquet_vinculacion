import { useQuery } from '@tanstack/react-query';
import { getPatrocinadores } from '../features/patrocinadores/api/patrocinadores.api';

// className viste el contenedor (p. ej. el panel blanco); sin auspiciantes queda un aviso breve
export function SponsorsCarousel({ className = '' }: { className?: string }) {
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
    <div className={className}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max items-center">
          {ALL_SPONSORS.map((sponsor, i) => {
            // Solo la primera vuelta se anuncia; las copias son relleno visual
            const copia = i >= patrocinadores.length;
            return (
              <div
                key={`${sponsor.id_patrocinador}-${i}`}
                aria-hidden={copia || undefined}
                className="mx-8 flex items-center justify-center w-36 h-20"
              >
                <img
                  src={sponsor.url_logo_patrocinador || ''}
                  alt={copia ? '' : sponsor.nombre_patrocinador}
                  className="w-full h-full object-contain"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
