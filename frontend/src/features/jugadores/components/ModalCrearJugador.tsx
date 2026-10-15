import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, UserPlus, AlertTriangle, Upload, FileText, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createJugador, 
  uploadFotoJugador, 
  uploadCedulaJugador,
  uploadActaJugador
} from '../api/jugadores.api';
import { buscarJugadorPorCedula } from '../../plantillas/api/plantillas.api';

// Esquema de validación coincidente con backend
const crearJugadorSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200, 'El nombre es muy largo'),
  documento_identificacion: z.string().regex(/^\d{10}$/, 'La cédula debe contener exactamente 10 dígitos numéricos'),
  fecha_nacimiento: z.string().refine((dateStr) => {
    const date = new Date(dateStr);
    return date < new Date();
  }, 'La fecha de nacimiento debe ser en el pasado'),
  genero: z.enum(['masculino', 'femenino'], { message: 'Debe seleccionar un género' }),
  correo: z.string().email('Debe ser un correo electrónico válido').or(z.literal('')),
  telefono: z.string().regex(/^\d{10}$/, 'El teléfono debe contener exactamente 10 dígitos numéricos').or(z.literal('')),
});

type CrearJugadorFormValues = z.infer<typeof crearJugadorSchema>;

interface ModalCrearJugadorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalCrearJugador({ isOpen, onClose }: ModalCrearJugadorProps) {
  const queryClient = useQueryClient();
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [isCheckingCedula, setIsCheckingCedula] = useState(false);

  // File states
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [actaFile, setActaFile] = useState<File | null>(null);

  const fotoRef = useRef<HTMLInputElement>(null);
  const cedulaRef = useRef<HTMLInputElement>(null);
  const actaRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    getValues,
  } = useForm<CrearJugadorFormValues>({
    resolver: zodResolver(crearJugadorSchema),
    mode: 'onChange',
    defaultValues: {
      genero: 'masculino',
      correo: '',
      telefono: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CrearJugadorFormValues) => {
      // 1. Crear el jugador base
      const payload = {
        ...data,
        correo: data.correo || null,
        telefono: data.telefono || null,
      };
      const res = await createJugador(payload);
      const nuevoJugador = res.data;
      if (!nuevoJugador) {
        throw new Error("No se devolvieron datos del jugador creado");
      }
      const idJugador = nuevoJugador.id_jugador || nuevoJugador.id;

      if (!idJugador) {
        throw new Error("No se pudo obtener el ID del jugador creado");
      }

      // 2. Subir archivos si existen
      const uploadPromises = [];
      if (fotoFile) uploadPromises.push(uploadFotoJugador(idJugador, fotoFile));
      if (cedulaFile) uploadPromises.push(uploadCedulaJugador(idJugador, cedulaFile));
      if (actaFile) uploadPromises.push(uploadActaJugador(idJugador, actaFile));

      if (uploadPromises.length > 0) {
        await Promise.allSettled(uploadPromises);
      }

      return res;
    },
    onSuccess: () => {
      toast.success('Jugador y documentos guardados exitosamente');
      queryClient.invalidateQueries({ queryKey: ['admin-jugadores'] });
      handleClose();
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        setDuplicateWarningOpen(true);
      } else {
        const msg = error.response?.data?.message || error.response?.data?.errors;
        if (typeof msg === 'object' && msg !== null) {
          const errorList = Object.values(msg).flat().join(' - ');
          toast.error(`Error de validación: ${errorList}`);
        } else {
          toast.error(msg || 'Error al crear el jugador');
        }
      }
    },
  });

  const handleClose = () => {
    reset();
    setFotoFile(null);
    setCedulaFile(null);
    setActaFile(null);
    setDuplicateWarningOpen(false);
    onClose();
  };

  const checkDuplicateCedula = async () => {
    const cedula = getValues('documento_identificacion');
    if (!cedula || cedula.length !== 10) return;
    
    try {
      setIsCheckingCedula(true);
      const res = await buscarJugadorPorCedula(cedula);
      if (res.data) {
        setDuplicateWarningOpen(true);
      }
    } catch (err) {
      console.error('Error verificando cédula', err);
    } finally {
      setIsCheckingCedula(false);
    }
  };

  const handleAceptarWarning = () => {
    handleClose();
  };

  const validateFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 4 MB.');
      return false;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-2xl bg-marino-claro rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-oro/10 text-oro flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-crema">Agregar Jugador</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-300 rounded-xl hover:bg-white/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 overflow-y-auto">
            <form id="crear-jugador-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-8">
              
              {/* Sección Datos Personales */}
              <div className="space-y-5">
                <h4 className="text-base font-bold text-crema border-b pb-2">Datos Personales</h4>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-300">Nombre Completo <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    {...register('nombre')}
                    placeholder="Ej. Juan Pérez"
                    className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow ${
                      errors.nombre ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                    }`}
                  />
                  {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="block text-sm font-semibold text-slate-300">Cédula <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      {...register('documento_identificacion', {
                        onBlur: () => checkDuplicateCedula()
                      })}
                      placeholder="10 dígitos"
                      maxLength={10}
                      className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow ${
                        errors.documento_identificacion ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                      }`}
                    />
                    {isCheckingCedula && (
                      <div className="absolute right-3 top-9">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-celeste"></div>
                      </div>
                    )}
                    {errors.documento_identificacion && <p className="text-xs text-red-400 mt-1">{errors.documento_identificacion.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-300">Fecha de Nacimiento <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      {...register('fecha_nacimiento')}
                      className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow ${
                        errors.fecha_nacimiento ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                      }`}
                    />
                    {errors.fecha_nacimiento && <p className="text-xs text-red-400 mt-1">{errors.fecha_nacimiento.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-300">Género <span className="text-red-400">*</span></label>
                    <select
                      {...register('genero')}
                      className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow bg-marino-claro ${
                        errors.genero ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                      }`}
                    >
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                    {errors.genero && <p className="text-xs text-red-400 mt-1">{errors.genero.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-300">Teléfono</label>
                    <input
                      type="text"
                      {...register('telefono')}
                      placeholder="10 dígitos (Opcional)"
                      maxLength={10}
                      className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow ${
                        errors.telefono ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                      }`}
                    />
                    {errors.telefono && <p className="text-xs text-red-400 mt-1">{errors.telefono.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-300">Correo Electrónico</label>
                  <input
                    type="email"
                    {...register('correo')}
                    placeholder="ejemplo@correo.com (Opcional)"
                    className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-shadow ${
                      errors.correo ? 'border-red-400/40 focus:ring-red-400/30 focus:border-red-400' : 'border-white/15 focus:ring-celeste/25 focus:border-celeste'
                    }`}
                  />
                  {errors.correo && <p className="text-xs text-red-400 mt-1">{errors.correo.message}</p>}
                </div>
              </div>

              {/* Sección Documentos */}
              <div className="space-y-5">
                <h4 className="text-base font-bold text-crema border-b pb-2">Documentos (Opcionales)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Foto de Perfil */}
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-300 mb-1 text-center">Foto de Perfil</span>
                    <span className="text-xs text-slate-400 text-center mb-3">Max 4MB (JPG, PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fotoRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) setFotoFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fotoRef.current?.click()}
                      className="px-3 py-1.5 bg-marino-claro border border-white/15 text-slate-300 text-xs font-semibold rounded-lg shadow-sm hover:bg-white/5"
                    >
                      {fotoFile ? 'Cambiar archivo' : 'Seleccionar'}
                    </button>
                    {fotoFile && <span className="mt-2 text-xs text-emerald-300 font-medium break-all text-center">{fotoFile.name}</span>}
                  </div>

                  {/* Cédula */}
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <FileText className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-300 mb-1 text-center">Cédula Identidad</span>
                    <span className="text-xs text-slate-400 text-center mb-3">Max 4MB (PDF, JPG)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      ref={cedulaRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) setCedulaFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => cedulaRef.current?.click()}
                      className="px-3 py-1.5 bg-marino-claro border border-white/15 text-slate-300 text-xs font-semibold rounded-lg shadow-sm hover:bg-white/5"
                    >
                      {cedulaFile ? 'Cambiar archivo' : 'Seleccionar'}
                    </button>
                    {cedulaFile && <span className="mt-2 text-xs text-emerald-300 font-medium break-all text-center">{cedulaFile.name}</span>}
                  </div>

                  {/* Acta de Bachiller */}
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-300 mb-1 text-center">Acta Bachiller</span>
                    <span className="text-xs text-slate-400 text-center mb-3">Max 4MB (PDF, JPG)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      ref={actaRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateFile(file)) setActaFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => actaRef.current?.click()}
                      className="px-3 py-1.5 bg-marino-claro border border-white/15 text-slate-300 text-xs font-semibold rounded-lg shadow-sm hover:bg-white/5"
                    >
                      {actaFile ? 'Cambiar archivo' : 'Seleccionar'}
                    </button>
                    {actaFile && <span className="mt-2 text-xs text-emerald-300 font-medium break-all text-center">{actaFile.name}</span>}
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-300 bg-marino-claro border border-white/15 rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="crear-jugador-form"
              disabled={mutation.isPending || !isValid || isCheckingCedula}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-colors ${
                (!isValid || isCheckingCedula || mutation.isPending)
                  ? 'bg-white/20 cursor-not-allowed text-slate-400'
                  : 'bg-celeste text-marino hover:bg-white'
              }`}
            >
              {mutation.isPending && (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              Guardar Jugador
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Aviso de Duplicado */}
      {duplicateWarningOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-marino-claro rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 mb-4">
              <AlertTriangle className="h-7 w-7 text-amber-300" />
            </div>
            <h3 className="text-xl font-bold text-crema mb-2">Jugador ya registrado</h3>
            <p className="text-sm text-slate-300 mb-6">
              Ya existe un jugador registrado con esta cédula en el sistema. 
              Si deseas actualizar su información o sus documentos, búscalo en la lista principal de jugadores y edita su perfil.
            </p>
            <button
              onClick={handleAceptarWarning}
              className="w-full py-2.5 bg-marino text-white rounded-xl font-semibold hover:bg-marino transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
