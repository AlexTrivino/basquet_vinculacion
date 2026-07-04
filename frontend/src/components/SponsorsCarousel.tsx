import { Award, Star, Shield, Zap, Globe, Users } from 'lucide-react';

const SPONSORS = [
  { name: 'SalesianaSports', icon: Award, color: 'text-blue-600' },
  { name: 'PatrocioUNO', icon: Star, color: 'text-amber-500' },
  { name: 'EquiposEcuador', icon: Shield, color: 'text-green-600' },
  { name: 'SportsFit', icon: Zap, color: 'text-purple-600' },
  { name: 'GlobalFan', icon: Globe, color: 'text-sky-600' },
  { name: 'ComunidadSDB', icon: Users, color: 'text-red-600' },
];

// Duplicamos para que el efecto loop sea fluido (sin espacios)
const ALL_SPONSORS = [...SPONSORS, ...SPONSORS];

export function SponsorsCarousel() {
  return (
    <section className="overflow-hidden w-full bg-white border-y border-gray-100 py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
        Nuestros Auspiciantes
      </p>
      <div className="overflow-hidden">
        <div className="animate-marquee">
          {ALL_SPONSORS.map((sponsor, i) => {
            const Icon = sponsor.icon;
            return (
              <div
                key={`${sponsor.name}-${i}`}
                className="mx-8 flex flex-col items-center justify-center gap-2 w-36"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-50 shadow-sm ring-1 ring-gray-200">
                  <Icon className={`h-8 w-8 ${sponsor.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-500 text-center leading-tight">
                  {sponsor.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
