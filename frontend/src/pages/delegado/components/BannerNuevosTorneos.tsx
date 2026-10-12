import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, ArrowRight, PlayCircle, Trash2 } from 'lucide-react';
import { getTorneosDisponiblesReinscripcion } from '../../../features/torneos/api/torneos.api';
import { deleteBorradorInscripcion } from '../../../features/equipos/api/equipos.api';
import type { Inscripcion } from '../../../types/api.types';
import { toast } from 'sonner';
import { AsyncButton } from '../../../components/AsyncButton';

// Mismas piezas que el perfil del equipo (marino, oro y celeste): el aviso vive sobre su portada
const MOVIL = 'relative z-20 block border-b border-oro/40 bg-marino-claro p-4 text-crema lg:hidden';
const FLOTANTE = 'absolute right-8 top-24 z-40 mt-8 hidden w-80 rounded-2xl border border-oro/40 bg-marino-claro/95 p-6 text-crema shadow-2xl shadow-black/50 backdrop-blur lg:block';
const ICONO = 'rounded-xl bg-oro/15 p-2 text-oro';
const PRIMARIO = 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-celeste px-4 py-2.5 text-sm font-bold text-marino transition-colors hover:bg-white';
const SECUNDARIO = 'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10';

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
        <div className={MOVIL}>
          <div className="mb-3 flex items-center gap-3">
            <div className={ICONO}>
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold">Inscripción en pausa</h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-300">
            Tienes una solicitud en borrador. Termínala o elimínala para iniciar otra.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/delegado/inscripcion" className={PRIMARIO}>
              Reanudar solicitud <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <AsyncButton onClickAction={handleDeleteBorrador} className={SECUNDARIO}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar
            </AsyncButton>
          </div>
        </div>

        {/* VISTA DESKTOP BORRADOR */}
        <div className={FLOTANTE}>
          <div className="mb-4 flex items-center gap-3">
            <div className={ICONO}>
              <PlayCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold leading-tight">Inscripción en pausa</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-slate-300">
            Tienes una solicitud de inscripción en borrador que aún no has completado. Debes terminarla o eliminarla para poder iniciar una nueva.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/delegado/inscripcion" className={PRIMARIO}>
              Reanudar solicitud <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <AsyncButton onClickAction={handleDeleteBorrador} className={SECUNDARIO}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar borrador
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
      <div className={MOVIL}>
        <div className="mb-3 flex items-center gap-3">
          <div className={ICONO}>
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold">¡Nuevo torneo!</h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          El torneo <strong className="text-crema">{torneo.nombre}</strong> ha abierto inscripciones.
        </p>
        <Link to={`/delegado/reinscripcion/${idEquipo}`} className={PRIMARIO}>
          Inscribir equipo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* VISTA DESKTOP FLOTANTE */}
      <div className={FLOTANTE}>
        <div className="mb-4 flex items-center gap-3">
          <div className={ICONO}>
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="font-display text-lg font-bold leading-tight">¡Nuevo torneo disponible!</h2>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-300">
          El torneo <strong className="text-crema">{torneo.nombre}</strong> ha abierto inscripciones. Inscribe a tu equipo ahora para asegurar tu cupo.
        </p>

        <Link to={`/delegado/reinscripcion/${idEquipo}`} className={PRIMARIO}>
          Inscribir equipo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
