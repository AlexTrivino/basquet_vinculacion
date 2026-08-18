import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Sparkles, ChevronRight } from 'lucide-react';
import type { Torneo } from '../../../types/api.types';

interface ActiveTournamentBadgeProps {
  torneosActivos: Torneo[];
}

export function ActiveTournamentBadge({ torneosActivos }: ActiveTournamentBadgeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const total = torneosActivos.length;

  useEffect(() => {
    if (total <= 1) return;

    const interval = setInterval(() => {
      // Efecto suave de transición (fade out -> cambio de índice -> fade in)
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % total);
        setIsVisible(true);
      }, 300);
    }, 4500);

    return () => clearInterval(interval);
  }, [total]);

  if (total === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-primary-200 text-xs font-semibold backdrop-blur-md border border-white/10 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Baloncesto competitivo en Manta</span>
      </div>
    );
  }

  const torneo = torneosActivos[currentIndex] || torneosActivos[0];
  const torneoId = torneo.id_torneo || torneo.id;
  const esEnCurso = (torneo.estado || '').toLowerCase() === 'en_curso';

  return (
    <div className="inline-flex flex-col items-center sm:items-start">
      <Link
        to={`/torneos/${torneoId}`}
        className={`group inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border shadow-md transition-all duration-300 ${
          esEnCurso
            ? 'bg-amber-500/20 text-amber-200 border-amber-400/30 hover:bg-amber-500/30 hover:border-amber-400/50'
            : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30 hover:border-emerald-400/50'
        } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              esEnCurso ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              esEnCurso ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>

        {esEnCurso ? (
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        )}

        <span className="text-xs font-bold uppercase tracking-wider">
          {esEnCurso ? 'En Juego:' : 'Inscripciones:'}
        </span>

        <span className="text-xs font-extrabold text-white max-w-[200px] sm:max-w-[320px] truncate group-hover:underline">
          {torneo.nombre_torneo || torneo.nombre}
        </span>

        <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Mini indicadores si hay más de 1 torneo activo */}
      {total > 1 && (
        <div className="flex gap-1.5 mt-1.5 px-2">
          {torneosActivos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Ver torneo activo ${idx + 1}`}
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsVisible(true);
                }, 200);
              }}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
