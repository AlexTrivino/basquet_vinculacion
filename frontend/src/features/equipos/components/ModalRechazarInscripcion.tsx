import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ModalRechazarInscripcionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  nombreEquipo: string;
  isLoading?: boolean;
}

export function ModalRechazarInscripcion({
  isOpen,
  onClose,
  onConfirm,
  nombreEquipo,
  isLoading = false,
}: ModalRechazarInscripcionProps) {
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
            <h3 id="modal-rechazar-title" className="text-lg font-bold text-gray-900">
              Rechazar Inscripción
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            ¿Estás seguro de que deseas rechazar la solicitud del equipo{' '}
            <strong className="text-gray-900 font-semibold">{nombreEquipo}</strong>?
          </p>

          <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200/80 text-xs text-red-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span> Acción permanente y destructiva
            </p>
            <p className="text-red-700/90 leading-relaxed">
              Esta acción eliminará el borrador del equipo, su nómina de jugadores y comprobantes de pago asociados, liberando las cédulas de los jugadores y el cupo del delegado.
            </p>
          </div>
        </div>

        {/* Footer con botones de acción */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rechazando...</span>
              </>
            ) : (
              <span>Sí, rechazar solicitud</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
