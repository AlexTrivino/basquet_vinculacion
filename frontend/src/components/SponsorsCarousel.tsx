import { useQuery } from '@tanstack/react-query';
import { getPatrocinadores } from '../features/patrocinadores/api/patrocinadores.api';

export function SponsorsCarousel() {
  const { data: patrocinadores = [], isLoading } = useQuery({
    queryKey: ['patrocinadores-publico'],
    queryFn: getPatrocinadores,
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  if (isLoading || !patrocinadores || patrocinadores.length === 0) {
    return null;
  }

  // Cuadruplicamos la lista para asegurar que el carrusel CSS fluya bien en pantallas ultra anchas
  const ALL_SPONSORS = [...patrocinadores, ...patrocinadores, ...patrocinadores, ...patrocinadores];

  return (
    <section className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-200 py-5 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-[100] overflow-hidden">
      <div className="overflow-hidden">
        <div className="animate-marquee flex w-max items-center">
          {ALL_SPONSORS.map((sponsor, i) => (
            <div
              key={`${sponsor.id_patrocinador}-${i}`}
              className="mx-8 flex items-center justify-center w-36 h-20"
            >
              <img 
                src={sponsor.url_logo_patrocinador || ''} 
                alt={sponsor.nombre_patrocinador}
                className="w-full h-full object-contain transition-transform duration-300 cursor-pointer drop-shadow-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
