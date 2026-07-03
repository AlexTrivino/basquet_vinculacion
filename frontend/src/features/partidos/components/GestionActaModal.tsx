import { useState } from 'react';
import { X, FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { subirActaPartido, eliminarActaPartido } from '../api/partidos.api';
import type { Partido } from '../../../types/api.types';

interface GestionActaModalProps {
  partido: Partido;
  onClose: () => void;
  onSuccess: () => void;
}

export function GestionActaModal({ partido, onClose, onSuccess }: GestionActaModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const idPartido = partido.id_partido || partido.id;

  if (!idPartido) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (partido.url_planilla_fiba) {
      toast('Advertencia', {
        description: 'Se borrará el acta anterior de forma permanente.',
        action: {
          label: 'Confirmar',
          onClick: () => doUpload(file)
        }
      });
    } else {
      await doUpload(file);
    }
  };

  const doUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await subirActaPartido(idPartido as number, file);
      toast.success('Acta FIBA subida exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al subir el acta');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    toast('Confirmación', {
      description: '¿Deseas eliminar permanentemente esta acta?',
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          setIsDeleting(true);
          try {
            await eliminarActaPartido(idPartido as number);
            toast.success('Acta eliminada exitosamente');
            onSuccess();
            onClose();
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al eliminar el acta');
          } finally {
            setIsDeleting(false);
          }
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="bg-primary-900 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Gestión de Acta Oficial FIBA</h3>
          <button onClick={onClose} className="text-primary-200 hover:text-white" disabled={isUploading || isDeleting}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500 mb-2">
            Partido: <span className="font-semibold text-gray-900">{partido.equipo_local?.nombre_equipo} vs {partido.equipo_visitante?.nombre_equipo}</span>
          </p>

          {!partido.url_planilla_fiba ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 text-center mb-4">No hay acta subida para este partido</p>
              <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors w-full text-center">
                {isUploading ? 'Subiendo...' : 'Seleccionar PDF'}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <a 
                href={partido.url_planilla_fiba} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-4 py-3 rounded-md transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ver Acta Actual
              </a>
              
              <label className="cursor-pointer flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-700 text-sm font-medium px-4 py-3 rounded-md transition-colors">
                <Upload className="w-4 h-4" />
                {isUploading ? 'Subiendo nueva acta...' : 'Reemplazar Acta'}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={isUploading || isDeleting}
                />
              </label>
              
              <button
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Eliminando...' : 'Eliminar Acta Permanentemente'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
