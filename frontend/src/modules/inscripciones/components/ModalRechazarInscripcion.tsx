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
      <div className="relative w-full max-w-md bg-marino-claro rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Cabecera con botón de cerrar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="modal-rechazar-title" className="text-lg font-bold text-crema">
              Rechazar Inscripción
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            ¿Estás seguro de que deseas rechazar la solicitud del equipo{' '}
            <strong className="text-crema font-semibold">{nombreEquipo}</strong>?
          </p>


        </div>

        {/* Footer con botones de acción */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-marino-claro border border-white/15 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-100 bg-red-500/20 rounded-xl hover:bg-red-500/30 active:bg-red-500/20 transition-colors disabled:opacity-50 shadow-sm"
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
