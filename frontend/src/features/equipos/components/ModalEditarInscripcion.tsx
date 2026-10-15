import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertTriangle } from 'lucide-react';
import { getTorneos } from '../../torneos/api/torneos.api';
import { getCategorias } from '../../categorias/api/categorias.api';
import { editarInscripcion, getInscripciones } from '../api/equipos.api';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { toast } from 'sonner';
import type { Inscripcion } from '../../../types/api.types';

interface ModalEditarInscripcionProps {
  isOpen: boolean;
  onClose: () => void;
  inscripcion: Inscripcion;
}

export function ModalEditarInscripcion({ isOpen, onClose, inscripcion }: ModalEditarInscripcionProps) {
  const queryClient = useQueryClient();
  
  const idInscripcion = inscripcion?.id_inscripcion || inscripcion?.id || 0;
  const currentIdTorneo = inscripcion?.torneo?.id_torneo || inscripcion?.torneo?.id || inscripcion?.id_torneo || '';
  const currentIdCategoria = inscripcion?.categoria?.id_categoria || inscripcion?.categoria?.id || inscripcion?.id_categoria || '';

  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>(currentIdTorneo as any);
  const [selectedCategoria, setSelectedCategoria] = useState<number | ''>(currentIdCategoria as any);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTorneo(currentIdTorneo as any);
      setSelectedCategoria(currentIdCategoria as any);
    }
  }, [isOpen, currentIdTorneo, currentIdCategoria]);

  // Fetch Torneos
  const { data: torneosRes } = useQuery({
    queryKey: ['torneos', 'admin-filter-editar'],
    queryFn: () => getTorneos(1, 100),
    enabled: isOpen,
  });

  const torneos = useMemo(() => {
    // Solo mostrar torneos programados (o el actual)
    return (torneosRes?.data || [])
      .filter((t: any) => t.estado === 'programado' || t.id_torneo === currentIdTorneo)
      .sort((a: any, b: any) => {
        const anioA = a.anio || (a.fecha_inicio ? new Date(a.fecha_inicio).getFullYear() : 0);
        const anioB = b.anio || (b.fecha_inicio ? new Date(b.fecha_inicio).getFullYear() : 0);
        if (anioB !== anioA) return anioB - anioA;
        return (b.id_torneo || 0) - (a.id_torneo || 0);
      });
  }, [torneosRes, currentIdTorneo]);

  // Fetch Categorias
  const { data: categoriasRes } = useQuery({
    queryKey: ['categorias', selectedTorneo],
    queryFn: () => getCategorias(1, 100, Number(selectedTorneo)),
    enabled: isOpen && selectedTorneo !== '',
  });
  
  const categorias = categoriasRes?.data || [];

  // Fetch inscripciones del equipo actual para validar duplicados
  const idEquipoActual = inscripcion?.equipo?.id_equipo || inscripcion?.equipo?.id || inscripcion?.id_equipo;
  const { data: inscripcionesEquipoRes } = useQuery({
    queryKey: ['inscripciones-equipo', idEquipoActual],
    queryFn: () => getInscripciones(1, 100, undefined, undefined, undefined, idEquipoActual),
    enabled: isOpen && !!idEquipoActual,
  });
  const inscripcionesEquipo = inscripcionesEquipoRes?.data || [];

  const mutation = useMutation({
    mutationFn: () => editarInscripcion(idInscripcion, { id_torneo: Number(selectedTorneo), id_categoria: Number(selectedCategoria) }),
    onSuccess: () => {
      toast.success('Inscripción editada correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-auditoria'] });
      setIsConfirmOpen(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ocurrió un error al editar la inscripción');
      setIsConfirmOpen(false);
    }
  });

  if (!isOpen || !inscripcion) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-marino-claro rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-crema">Editar Inscripción</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-300 rounded-lg hover:bg-white/15 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Aviso */}
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-semibold mb-1">Nota importante:</p>
                <p>Solo se pueden editar inscripciones si el torneo destino está en estado <b>programado</b>.</p>
                <p className="mt-1">Para editar la plantilla de jugadores, dirígete al panel de <b>Gestión de Equipos</b>.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-300">Torneo</label>
                <select
                  value={selectedTorneo}
                  onChange={(e) => {
                    setSelectedTorneo(Number(e.target.value));
                    setSelectedCategoria('');
                  }}
                  className="w-full h-11 px-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
                >
                  <option value="" disabled>Seleccione un torneo...</option>
                  {torneos.map((t: any) => (
                    <option key={t.id_torneo || t.id} value={t.id_torneo || t.id} disabled={t.estado !== 'programado' && t.id_torneo !== currentIdTorneo}>
                      {t.nombre || t.nombre_torneo} {t.estado !== 'programado' ? `(${t.estado})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-300">Categoría</label>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(Number(e.target.value))}
                  disabled={!selectedTorneo}
                  className="w-full h-11 px-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro disabled:bg-white/10 disabled:text-slate-400"
                >
                  <option value="" disabled>Seleccione una categoría...</option>
                  {categorias.map((c: any) => {
                    const isAlreadyInscribed = inscripcionesEquipo.some(
                      (ie: any) => ie.torneo?.id_torneo === Number(selectedTorneo) && 
                                   ie.categoria?.id_categoria === (c.id_categoria || c.id) &&
                                   (ie.id_inscripcion || ie.id) !== idInscripcion
                    );
                    return (
                      <option 
                        key={c.id_categoria || c.id} 
                        value={c.id_categoria || c.id}
                        disabled={isAlreadyInscribed}
                      >
                        {c.nombre_categoria || c.nombre} {isAlreadyInscribed ? '(Ya inscrito)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 bg-white/5 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-300 bg-marino-claro border border-white/15 rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={!selectedTorneo || !selectedCategoria || (selectedTorneo === currentIdTorneo && selectedCategoria === currentIdCategoria)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-marino bg-celeste rounded-xl hover:bg-white focus:ring-4 focus:ring-celeste/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <ConfirmationModal
          title="Confirmar edición"
          description="¿Deseas guardar los cambios en esta inscripción? Las plantillas existentes se reasignarán automáticamente."
          onConfirm={() => mutation.mutateAsync()}
          onCancel={() => setIsConfirmOpen(false)}
          isDangerous={false}
        />
      )}
    </>
  );
}
