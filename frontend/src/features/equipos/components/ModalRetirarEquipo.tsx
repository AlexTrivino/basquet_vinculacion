import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ModalRetirarEquipoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  nombreEquipo: string;
  isLoading?: boolean;
}

export function ModalRetirarEquipo({
  isOpen,
  onClose,
  onConfirm,
  nombreEquipo,
  isLoading = false,
}: ModalRetirarEquipoProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-rechazar-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Cabecera con botón de cerrar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="modal-retirar-title" className="text-lg font-bold text-gray-900">
              Retirar Equipo
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Estás a punto de retirar a <strong className="text-gray-900 font-bold">{nombreEquipo}</strong> del torneo.
          </p>
          <div className="bg-red-50 text-red-800 text-sm p-4 rounded-xl border border-red-100">
            <strong>Atención:</strong> Esta acción cambiará el estado del equipo a <em>Retirado</em> y eliminará todos sus partidos <strong>programados futuros</strong> del calendario para que puedan ser reagendados.
            <br className="my-2" />
            <span className="font-semibold underline">Su historial estadístico de partidos ya jugados se mantendrá intacto.</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Retiro
          </button>
        </div>
      </div>
    </div>
  );
}
