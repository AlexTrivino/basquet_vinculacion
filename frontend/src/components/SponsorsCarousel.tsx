const SPONSORS = [
  { name: 'Auspiciante 1', image: '/auspiciantes/a1.jpeg?v=2' },
  { name: 'Auspiciante 2', image: '/auspiciantes/a2.png?v=3' },
  { name: 'Auspiciante 3', image: '/auspiciantes/a4.png?v=2' },
  { name: 'Auspiciante 4', image: '/auspiciantes/a5.png?v=2' },
  { name: 'Auspiciante 5', image: '/auspiciantes/a6.png?v=3' },
  { name: 'Auspiciante 6', image: '/auspiciantes/a7.png?v=2' },
  { name: 'Auspiciante 7', image: '/auspiciantes/a8.png?v=2' },
];

// Cuadruplicamos la lista en lugar de duplicarla. 
// Esto asegura que la mitad del carrusel (el 50% que se anima en index.css) 
// mida más de 2500px y nunca se quede sin contenido antes de hacer el loop en pantallas anchas.
const ALL_SPONSORS = [...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS];

export function SponsorsCarousel() {
  return (
    <section className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-200 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-[100] overflow-hidden">
      <div className="overflow-hidden">
        <div className="animate-marquee flex w-max items-center">
          {ALL_SPONSORS.map((sponsor, i) => (
            <div
              key={`${sponsor.name}-${i}`}
              className="mx-8 flex items-center justify-center w-32 h-16"
            >
              <img 
                src={sponsor.image} 
                alt={sponsor.name}
                className="w-full h-full object-contain saturate-50 opacity-80 hover:saturate-100 hover:opacity-100 hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-sm hover:drop-shadow-md"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
