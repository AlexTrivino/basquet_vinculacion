import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Flame,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import type { Torneo } from '../../../types/api.types';

interface TorneoCardHomeProps {
  torneo: Torneo;
}

function formatearFechaInicio(inicioStr?: string): string {
  if (!inicioStr) return 'Fecha por confirmar';
  try {
    const dInicio = new Date(inicioStr + 'T00:00:00');
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    const diaIni = dInicio.getDate();
    const mesIni = meses[dInicio.getMonth()];
    const anioIni = dInicio.getFullYear();

    return `Inicio: ${diaIni} ${mesIni} ${anioIni}`;
  } catch {
    return inicioStr;
  }
}

export function TorneoCardHome({ torneo }: TorneoCardHomeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const torneoId = torneo.id_torneo || torneo.id;
  const nombre = torneo.nombre_torneo || torneo.nombre || 'Torneo de Baloncesto';
  const estado = (torneo.estado || 'programado').toLowerCase();
  const categorias = torneo.categorias || [];
  const fechaInicioTexto = formatearFechaInicio(torneo.fecha_inicio);

  const esEnCurso = estado === 'en_curso';
  const esInscripcion = estado === 'inscripcion';
  const esFinalizado = estado === 'finalizado';

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white border border-gray-200/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Glow decorativo sutil en hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Cabecera de la Tarjeta: Badge de Estado y Fechas */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Badge de Estado */}
          <div className="relative">
            {esEnCurso && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <Flame className="w-3.5 h-3.5 text-emerald-600" />
                EN CURSO
              </span>
            )}

            {esInscripcion && (
              <div
                className="relative inline-block"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-sm cursor-help hover:bg-amber-100 transition-colors">
                  <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                  INSCRIPCIONES ABIERTAS
                  <Info className="w-3 h-3 text-amber-500 opacity-80" />
                </span>

                {/* Tooltip Informativo para Delegados */}
                {showTooltip && (
                  <div className="absolute left-0 bottom-full mb-2 z-30 w-64 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-2xl border border-gray-700 animate-in fade-in zoom-in-95">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="leading-snug">
                        <strong className="text-amber-300 font-semibold block mb-0.5">¿Deseas participar?</strong>
                        Debes crear una cuenta o iniciar sesión como <strong>delegado</strong> para inscribir a tu equipo en este torneo.
                      </p>
                    </div>
                    {/* Flecha inferior del tooltip */}
                    <div className="absolute left-6 top-full -mt-1 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}
              </div>
            )}

            {esFinalizado && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                FINALIZADO
              </span>
            )}

            {!esEnCurso && !esInscripcion && !esFinalizado && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                PROGRAMADO
              </span>
            )}
          </div>

          {/* Trofeo o icono decorativo */}
          <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-colors">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        {/* Nombre del Torneo */}
        <h3 className="text-xl font-black text-gray-900 tracking-tight leading-snug group-hover:text-primary-600 transition-colors mb-2">
          {nombre}
        </h3>

        {/* Fecha de Inicio del Torneo */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-4">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{fechaInicioTexto}</span>
        </div>

        {/* Categorías Disponibles */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <span>Categorías ({categorias.length || 'Por definir'})</span>
          </div>

          {categorias.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {categorias.slice(0, 3).map((cat, idx) => (
                <span
                  key={cat.id_categoria || cat.id || idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200/80 group-hover:border-gray-300 transition-colors"
                >
                  {cat.nombre_categoria || cat.nombre}
                </span>
              ))}
              {categorias.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">
                  +{categorias.length - 3} más
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Categorías generales del torneo</p>
          )}
        </div>
      </div>

      {/* Botón de Acción Inferior */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <Link
          to={`/torneos/${torneoId}`}
          className="inline-flex items-center justify-between w-full rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-600 hover:text-white transition-all duration-200 group/btn shadow-sm"
        >
          <span>Ver detalles y posiciones</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
