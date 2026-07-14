import { UserCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jugador: any;
  isPending: boolean;
}

export function ConfirmarJugadorModal({ isOpen, onClose, onConfirm, jugador, isPending }: Props) {
  if (!isOpen || !jugador) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary-600" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4 border border-primary-100 shadow-sm">
            <UserCheck className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            Jugador Preexistente
          </h2>
          
          <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
            Este jugador ya está registrado en la plataforma con la cédula <strong>{jugador.documento_identificacion}</strong>. 
            ¿Deseas agregarlo a tu equipo? Sus datos básicos ({jugador.nombre}) y foto serán los de su registro original.
          </p>

          {jugador.url_foto && (
            <div className="mb-6">
              <img 
                src={jugador.url_foto} 
                alt="Foto original del jugador" 
                className="w-20 h-20 rounded-full object-cover shadow border border-gray-200 mx-auto"
              />
            </div>
          )}
          
          <div className="w-full flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm bg-primary-600 hover:bg-primary-700 hover:shadow-md"
            >
              {isPending ? 'Vinculando...' : 'Vincular Jugador'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
