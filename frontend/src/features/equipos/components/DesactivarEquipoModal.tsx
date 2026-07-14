import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { desactivarEquipo } from '../api/equipos.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idEquipo: number;
  isAdmin?: boolean;
}

export function DesactivarEquipoModal({ isOpen, onClose, idEquipo, isAdmin = false }: Props) {
  const [countdown, setCountdown] = useState(15);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setActiveTeamId } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setCountdown(15);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const desactivarMutation = useMutation({
    mutationFn: (id: number) => desactivarEquipo(id),
    onSuccess: () => {
      toast.success('El equipo ha sido desactivado permanentemente.');
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
        onClose();
      } else {
        queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
        queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
        setActiveTeamId(null);
        onClose();
        navigate('/delegado/dashboard');
      }
    },
    onError: () => {
      toast.error('Ocurrió un error al intentar desactivar el equipo.');
    }
  });

  if (!isOpen) return null;

  const handleDesactivar = () => {
    if (countdown === 0) {
      desactivarMutation.mutate(idEquipo);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            Desactivar Equipo
          </h2>
          
          <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
            {isAdmin 
              ? "LA DESACTIVACIÓN DE UN EQUIPO PUEDE SER REVOCADA DESDE EL PANEL DE GESTIÓN DE EQUIPOS." 
              : "LA DESACTIVACIÓN DE UN EQUIPO SOLO PUEDE SER REVOCADA POR EL ADMINISTRADOR DE LA ORGANIZACIÓN. ESTA ACCIÓN LE PERMITIRÁ REGISTRAR UN NUEVO EQUIPO EN CASO DE TENER CUPOS DISPONIBLES."}
          </p>
          
          <div className="w-full flex gap-3">
            <button
              onClick={onClose}
              disabled={desactivarMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDesactivar}
              disabled={countdown > 0 || desactivarMutation.isPending}
              className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-sm ${
                countdown > 0 || desactivarMutation.isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 hover:shadow-md"
              }`}
            >
              {desactivarMutation.isPending 
                ? 'Procesando...' 
                : countdown > 0 
                  ? `Desactivar en ${countdown}s` 
                  : 'Desactivar Equipo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
