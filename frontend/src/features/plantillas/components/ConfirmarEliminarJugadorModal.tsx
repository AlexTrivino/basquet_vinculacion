import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jugadorNombre: string;
  dorsal?: number | null;
  isDeleting?: boolean;
  willBreakMinimo?: boolean;
  minJugadores?: number;
}

export function ConfirmarEliminarJugadorModal({
  isOpen,
  onClose,
  onConfirm,
  jugadorNombre,
  dorsal,
  isDeleting = false,
  willBreakMinimo = false,
  minJugadores = 5,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-marino-claro rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-white/10 animate-scale-up">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />

        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-red-500/10 text-red-300 rounded-2xl flex items-center justify-center mb-3.5 border border-red-400/20 shadow-sm">
            <Trash2 className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-crema mb-1">
            ¿Remover jugador del equipo?
          </h2>

          <p className="text-sm text-slate-300 mb-4">
            Estás a punto de quitar a <strong className="text-crema font-semibold">{jugadorNombre}</strong>
            {dorsal !== null && dorsal !== undefined ? ` (Dorsal #${dorsal})` : ''} de la nómina oficial.
          </p>

          {willBreakMinimo && (
            <div className="w-full mb-5 p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-left flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100">
                <p className="font-bold">Advertencia reglamentaria</p>
                <p className="text-amber-200 mt-0.5">
                  Al eliminar este jugador, el equipo quedará por debajo del mínimo reglamentario ({minJugadores} jugadores) necesario para participar.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 w-full mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 font-semibold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-100 font-semibold text-sm shadow-sm shadow-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <span>Sí, remover</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
