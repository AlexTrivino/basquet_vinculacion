import { UserCheck, AlertTriangle } from 'lucide-react';
import type { Jugador } from '../../../types/api.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jugador: Jugador | any | null;
  isPending?: boolean;
  yaEnTorneo?: boolean;
  equipoTorneo?: string | null;
}

export function ConfirmarJugadorModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  jugador, 
  isPending,
  yaEnTorneo,
  equipoTorneo
}: Props) {
  if (!isOpen || !jugador) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-gray-100">
        <div className={`absolute top-0 left-0 w-full h-2 ${yaEnTorneo ? 'bg-amber-500' : 'bg-primary-600'}`} />
        
        <div className="flex flex-col items-center text-center">
          {yaEnTorneo ? (
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4 border border-primary-100 shadow-sm">
              <UserCheck className="w-8 h-8" />
            </div>
          )}
          
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            {yaEnTorneo ? 'Jugador ya inscrito en esta categoría' : 'Jugador Registrado'}
          </h2>
          
          {yaEnTorneo ? (
            <div className="text-sm text-gray-700 mb-5 font-medium leading-relaxed bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-left">
              El jugador <strong>{jugador.nombre}</strong> (Cédula: <strong>{jugador.documento_identificacion}</strong>) ya se encuentra registrado en el equipo <strong>{equipoTorneo || 'otro equipo'}</strong> dentro de esta categoría.
              <br /><br />
              <span className="text-amber-900 font-semibold">Un jugador no puede estar en dos equipos dentro de la misma categoría.</span>
            </div>
          ) : (
            <div className="text-sm text-gray-600 mb-5 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
              El jugador <strong>{jugador.nombre}</strong> con documento <strong>{jugador.documento_identificacion}</strong> ya está registrado en la plataforma.
              <br /><br />
              Al pulsar <strong>Aceptar</strong>, el formulario se autocompletará con sus datos oficiales para que puedas asignarle el número de camiseta e integrarlo a tu plantilla.
            </div>
          )}

          {jugador.url_foto && (
            <div className="mb-5">
              <img 
                src={jugador.url_foto} 
                alt="Foto del jugador" 
                className={`w-20 h-20 rounded-full object-cover shadow border-2 mx-auto ${yaEnTorneo ? 'border-amber-300' : 'border-primary-200'}`}
              />
            </div>
          )}
          
          <div className="w-full flex gap-3">
            {yaEnTorneo ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm bg-amber-600 hover:bg-amber-700 hover:shadow-md cursor-pointer"
              >
                Entendido
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm bg-primary-600 hover:bg-primary-700 hover:shadow-md cursor-pointer"
                >
                  Aceptar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
