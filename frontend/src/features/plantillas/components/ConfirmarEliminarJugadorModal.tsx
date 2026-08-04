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
  minJugadores = 10,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-gray-100 animate-scale-up">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />

        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-3.5 border border-red-100 shadow-sm">
            <Trash2 className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">
            ¿Remover jugador del equipo?
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Estás a punto de quitar a <strong className="text-gray-900 font-semibold">{jugadorNombre}</strong>
            {dorsal !== null && dorsal !== undefined ? ` (Dorsal #${dorsal})` : ''} de la nómina oficial.
          </p>

          {willBreakMinimo && (
            <div className="w-full mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Advertencia reglamentaria</p>
                <p className="text-amber-700 mt-0.5">
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
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm shadow-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
