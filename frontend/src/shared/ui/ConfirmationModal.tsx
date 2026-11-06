import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export function ConfirmationModal({ title, description, onConfirm, onCancel, isDangerous = false }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-marino-claro rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4 ${isDangerous ? 'bg-red-500/15' : 'bg-celeste/15'}`}>
            <AlertTriangle className={`h-7 w-7 ${isDangerous ? 'text-red-300' : 'text-celeste'}`} />
          </div>
          <h3 className="text-xl font-bold text-crema mb-2">{title}</h3>
          <p className="text-sm text-slate-400 mb-6">{description}</p>
          
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 rounded-md border border-white/15 bg-marino-claro px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 focus:outline-none"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold focus:outline-none ${
                isDangerous ? 'bg-red-500/20 text-red-100 ring-1 ring-red-300/40 hover:bg-red-500/30' : 'bg-celeste text-marino hover:bg-white'
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
