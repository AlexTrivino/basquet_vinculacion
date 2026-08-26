import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, ArrowRight, PlayCircle, Trash2 } from 'lucide-react';
import { getTorneosDisponiblesReinscripcion } from '../../../features/torneos/api/torneos.api';
import { deleteBorradorInscripcion } from '../../../features/equipos/api/equipos.api';
import type { Inscripcion } from '../../../types/api.types';
import { toast } from 'sonner';
import { AsyncButton } from '../../../components/AsyncButton';

interface BannerNuevosTorneosProps {
  inscripciones: Inscripcion[];
  idEquipo: number;
}

export function BannerNuevosTorneos({ inscripciones, idEquipo }: BannerNuevosTorneosProps) {
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useQuery({
    queryKey: ['torneos', 'disponibles-reinscripcion'],
    queryFn: getTorneosDisponiblesReinscripcion,
  });

  const borradorActual = inscripciones.find(
    (ins) => ins.estado_inscripcion === 'borrador' || ins.estado === 'borrador'
  );

  const handleDeleteBorrador = async () => {
    if (!borradorActual) return;
    try {
      await deleteBorradorInscripcion(borradorActual.id_inscripcion || borradorActual.id!);
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
      toast.success('Borrador eliminado correctamente.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el borrador.');
    }
  };

  if (borradorActual) {
    return (
      <>
        {/* VISTA MÓVIL BORRADOR */}
        <div className="block lg:hidden bg-gradient-to-r from-amber-200 to-yellow-400 p-4 border-b border-yellow-500 shadow-sm relative z-20 text-yellow-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/40 p-2 rounded-xl backdrop-blur-sm">
              <PlayCircle className="w-5 h-5 text-yellow-800" />
            </div>
            <h3 className="font-bold text-lg">Inscripción en Pausa</h3>
          </div>
          <p className="text-sm text-yellow-800 mb-4 leading-relaxed">
            Tienes una solicitud en borrador. Termínala o elimínala para iniciar otra.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/delegado/inscripcion"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-600 text-white px-4 py-2 text-sm font-bold transition-colors hover:bg-yellow-700 shadow-sm"
            >
              Reanudar Solicitud <ArrowRight className="w-4 h-4" />
            </Link>
            <AsyncButton
              onClickAction={handleDeleteBorrador}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/50 text-yellow-900 px-4 py-2 text-sm font-bold transition-colors hover:bg-white/80 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </AsyncButton>
          </div>
        </div>

        {/* VISTA DESKTOP BORRADOR */}
        <div className="mt-8 hidden lg:block absolute top-24 right-8 z-40 bg-gradient-to-b from-amber-200 to-yellow-400 shadow-2xl rounded-2xl p-6 border border-yellow-500 w-80 transition-all duration-300 text-yellow-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/40 p-2.5 rounded-xl backdrop-blur-sm">
              <PlayCircle className="w-6 h-6 text-yellow-800" />
            </div>
            <h2 className="font-bold text-lg leading-tight">Inscripción en Pausa</h2>
          </div>
          <p className="text-sm text-yellow-800 mb-6 leading-relaxed">
            Tienes una solicitud de inscripción en borrador que aún no has completado. Debes terminarla o eliminarla para poder iniciar una nueva.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/delegado/plantilla"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-yellow-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Reanudar Solicitud <ArrowRight className="w-4 h-4" />
            </Link>
            <AsyncButton
              onClickAction={handleDeleteBorrador}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/50 px-4 py-3 text-sm font-bold text-yellow-900 transition-all hover:bg-white/80 shadow-sm hover:shadow-md"
            >
              <Trash2 className="w-4 h-4" /> Eliminar Borrador
            </AsyncButton>
          </div>
        </div>
      </>
    );
  }

  // SI NO HAY BORRADOR, FLUJO NORMAL DE NUEVOS TORNEOS
  const torneosDisponibles = response?.data || [];
  if (isLoading || torneosDisponibles.length === 0) return null;

  // Filtrar las inscripciones que pertenecen específicamente a este equipo
  const inscripcionesDelEquipo = inscripciones.filter(
    (ins) => (ins.equipo?.id_equipo || ins.equipo?.id || ins.id_equipo) === idEquipo
  );

  // Obtener los IDs de torneos en los que este equipo ya está inscrito
  const idsTorneosInscritos = new Set(
    inscripcionesDelEquipo.map((ins) => ins.id_torneo || ins.torneo?.id_torneo || ins.torneo?.id)
  );
  
  const torneosParaReinscribir = torneosDisponibles.filter(
    (t) => !idsTorneosInscritos.has(t.id_torneo || t.id!)
  );

  if (torneosParaReinscribir.length === 0) return null;

  const torneo = torneosParaReinscribir[0]; // Show the first one available

  return (
    <>
      {/* VISTA MÓVIL */}
      <div className="block lg:hidden bg-gradient-to-r from-amber-500 to-orange-600 p-4 border-b border-orange-400 shadow-sm relative z-20 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-lg">¡Nuevo Torneo!</h3>
        </div>
        <p className="text-sm text-amber-50 mb-4 leading-relaxed">
          El torneo <strong>{torneo.nombre}</strong> ha abierto inscripciones.
        </p>
        <Link
          to={`/delegado/reinscripcion/${idEquipo}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white text-orange-600 px-4 py-2 text-sm font-bold transition-colors hover:bg-orange-50 shadow-sm"
        >
          Inscribir Equipo <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* VISTA DESKTOP FLOTANTE */}
      <div className="mt-8 hidden lg:block absolute top-24 right-8 z-40 bg-gradient-to-b from-amber-500 to-orange-600 shadow-2xl rounded-2xl p-6 border border-orange-400 w-80 transition-all duration-300 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-bold text-lg leading-tight">¡Nuevo Torneo Disponible!</h2>
        </div>

        <p className="text-sm text-amber-50 mb-6 leading-relaxed">
          El torneo <strong>{torneo.nombre}</strong> ha abierto inscripciones. Inscribe a tu equipo ahora para asegurar tu cupo.
        </p>

        <Link
          to={`/delegado/reinscripcion/${idEquipo}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-orange-600 transition-all hover:bg-orange-50 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          Inscribir Equipo <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}
