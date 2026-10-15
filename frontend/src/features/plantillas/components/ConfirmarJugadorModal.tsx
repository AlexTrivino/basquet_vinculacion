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
      <div className="bg-marino-claro rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-white/10">
        <div className={`absolute top-0 left-0 w-full h-1 ${yaEnTorneo ? 'bg-amber-400' : 'bg-oro/70'}`} />
        
        <div className="flex flex-col items-center text-center">
          {yaEnTorneo ? (
            <div className="w-16 h-16 bg-amber-500/10 text-amber-300 rounded-full flex items-center justify-center mb-4 border border-amber-400/30 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-oro/10 text-oro rounded-full flex items-center justify-center mb-4 border border-oro/30 shadow-sm">
              <UserCheck className="w-8 h-8" />
            </div>
          )}
          
          <h2 className="text-xl font-extrabold text-crema mb-2">
            {yaEnTorneo ? 'Jugador ya inscrito en esta categoría' : 'Jugador Registrado'}
          </h2>
          
          {yaEnTorneo ? (
            <div className="text-sm text-slate-300 mb-5 font-medium leading-relaxed bg-amber-500/10 p-4 rounded-xl border border-amber-400/30 text-left">
              El jugador <strong>{jugador.nombre}</strong> (Cédula: <strong>{jugador.documento_identificacion}</strong>) ya se encuentra registrado en el equipo <strong>{equipoTorneo || 'otro equipo'}</strong> dentro de esta categoría.
              <br /><br />
              <span className="text-amber-100 font-semibold">Un jugador no puede estar en dos equipos dentro de la misma categoría.</span>
            </div>
          ) : (
            <div className="text-sm text-slate-300 mb-5 font-medium leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 text-left">
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
                className={`w-20 h-20 rounded-full object-cover shadow border-2 mx-auto ${yaEnTorneo ? 'border-amber-400/40' : 'border-celeste/30'}`}
              />
            </div>
          )}
          
          <div className="w-full flex gap-3">
            {yaEnTorneo ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-amber-100 transition-all shadow-sm bg-amber-500/20 hover:bg-amber-500/30 hover:shadow-md cursor-pointer"
              >
                Entendido
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-marino transition-all shadow-sm bg-celeste hover:bg-white hover:shadow-md cursor-pointer"
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
