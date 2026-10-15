import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Trash2, ArrowLeft } from 'lucide-react';
import { AsyncButton } from '../../../components/AsyncButton';
import { reinscribirEquipo, subirComprobante } from '../api/equipos.api';
import { getCategorias } from '../../categorias/api/categorias.api';
import { getTorneosDisponiblesReinscripcion } from '../../torneos/api/torneos.api';

const MAX_COMPROBANTE_SIZE = 5 * 1024 * 1024; // 5 MB

const reinscripcionSchema = z.object({
  torneo: z.string().min(1, 'Debes seleccionar un torneo'),
  categoria: z.string().min(1, 'Debes seleccionar una categoría'),
  clonarPlantilla: z.boolean().default(true),
});

type ReinscripcionValues = {
  torneo: string;
  categoria: string;
  clonarPlantilla: boolean;
};

interface ReinscripcionWizardProps {
  idEquipo: number;
  idTorneo?: number;
}

export function ReinscripcionWizard({ idEquipo }: ReinscripcionWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

  const { data: torneosRes, isLoading: isLoadingTorneos } = useQuery({
    queryKey: ['torneos', 'disponibles-reinscripcion'],
    queryFn: getTorneosDisponiblesReinscripcion,
  });

  const torneos = torneosRes?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ReinscripcionValues>({
    resolver: zodResolver(reinscripcionSchema) as any,
    defaultValues: { torneo: '', categoria: '', clonarPlantilla: true },
    mode: 'onChange',
  });

  const selectedTorneo = watch('torneo');

  const { data: categoriasRes, isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias', selectedTorneo],
    queryFn: () => getCategorias(1, 100, Number(selectedTorneo)),
    enabled: !!selectedTorneo,
  });

  const categorias = categoriasRes?.data || [];

  const onSubmit: SubmitHandler<ReinscripcionValues> = async (data) => {
    if (!comprobanteFile) {
      toast.error('Debes seleccionar un archivo para el comprobante.');
      return;
    }
    if (comprobanteFile.size > MAX_COMPROBANTE_SIZE) {
      toast.error('El comprobante excede el tamaño máximo permitido (5 MB).');
      return;
    }

    try {
      // 1. Crear inscripción (borrador) y opcionalmente clonar plantilla
      const res = await reinscribirEquipo({
        id_torneo: Number(data.torneo),
        id_equipo: idEquipo,
        id_categoria: Number(data.categoria),
        clonar_plantilla: data.clonarPlantilla ?? true,
      });

      // 2. Subir el comprobante
      if (res?.data?.id_inscripcion || res?.data?.id) {
        await subirComprobante(res.data.id_inscripcion || res.data.id!, comprobanteFile);
      }

      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
      toast.success('Reinscripción iniciada. Continúa con el registro de jugadores.');
      navigate('/delegado/inscripcion');
    } catch (error: any) {
      let message = error?.response?.data?.message || 'Error al procesar la reinscripción';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-marino-claro p-6 shadow-xl sm:p-8">
      <button
        onClick={() => navigate('/delegado/dashboard')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-crema transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al panel
      </button>

      <h2 className="text-2xl font-bold text-crema">Reinscribir Equipo</h2>
      <p className="mb-6 mt-2 text-sm text-slate-300 leading-relaxed">
        Selecciona la categoría y adjunta el comprobante de pago para la nueva temporada. 
        Puedes importar automáticamente los jugadores de tu última participación.
      </p>

      {/* REGLAS DE REINSCRIPCIÓN */}
      <div className="mb-6 rounded-xl bg-blue-500/10 p-4 border border-blue-400/20 flex gap-3">
        <div className="shrink-0 text-blue-400 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-100">Reglas de Reinscripción</h3>
          <p className="text-sm text-blue-200 mt-1 leading-relaxed">
            Un equipo solo puede registrarse en <strong>una (1) categoría por cada torneo</strong>. 
            Al finalizar este paso, la solicitud se guardará como <strong>borrador</strong> y no podrás 
            iniciar otra hasta que la completes o la elimines.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Torneo */}
        <div>
          <label htmlFor="torneo" className="mb-1 block text-sm font-medium text-slate-300">
            Torneo <span className="text-red-400">*</span>
          </label>
          <select
            id="torneo"
            {...register('torneo')}
            disabled={isLoadingTorneos}
            className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm focus:border-celeste focus:outline-none focus:ring-2 focus:ring-celeste/25 transition-all disabled:bg-white/5"
          >
            <option value="">Selecciona un torneo...</option>
            {torneos.map((t: any) => (
              <option key={t.id_torneo || t.id} value={t.id_torneo || t.id}>
                {t.nombre_torneo || t.nombre}
              </option>
            ))}
          </select>
          {errors.torneo && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.torneo.message}</p>}
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-slate-300">
            Categoría <span className="text-red-400">*</span>
          </label>
          <select
            id="categoria"
            {...register('categoria')}
            disabled={isLoadingCategorias}
            className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm focus:border-celeste focus:outline-none focus:ring-2 focus:ring-celeste/25 transition-all disabled:bg-white/5"
          >
            <option value="">Selecciona una categoría...</option>
            {categorias.map((c) => (
              <option key={c.id_categoria || c.id} value={c.id_categoria || c.id}>
                {c.nombre_categoria || c.nombre} ({c.genero_categoria})
              </option>
            ))}
          </select>
          {errors.categoria && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.categoria.message}</p>}
        </div>

        {/* Clonar Plantilla (Toggle switch o checkbox) */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-celeste/5 border border-celeste/30">
          <div className="flex h-6 items-center">
            <input
              id="clonarPlantilla"
              type="checkbox"
              {...register('clonarPlantilla')}
              className="h-5 w-5 rounded border-white/15 text-celeste focus:ring-celeste"
            />
          </div>
          <div className="text-sm leading-6">
            <label htmlFor="clonarPlantilla" className="font-bold text-crema cursor-pointer">
              Importar jugadores del torneo anterior
            </label>
            <p className="text-slate-400 text-xs mt-0.5">
              Traerá automáticamente la nómina de tu última participación. Podrás editarla antes de enviar.
            </p>
          </div>
        </div>

        {/* Comprobante de Pago */}
        <div>
          <label htmlFor="comprobante" className="mb-1 block text-sm font-medium text-slate-300">
            Comprobante de Pago <span className="text-red-400">*</span>
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Formato PDF o Imagen (JPG, PNG). Tamaño máximo: 5 MB.
          </p>
          <div className="flex items-center gap-2">
            <input
              id="comprobante"
              type="file"
              ref={comprobanteInputRef}
              accept=".pdf, .jpg, .jpeg, .png, .webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > MAX_COMPROBANTE_SIZE) {
                    toast.error('El comprobante excede el tamaño máximo permitido (5 MB).');
                    e.target.value = '';
                    setComprobanteFile(null);
                    return;
                  }
                  setComprobanteFile(file);
                } else {
                  setComprobanteFile(null);
                }
              }}
              className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm focus:border-celeste focus:outline-none focus:ring-2 focus:ring-celeste/25 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-celeste/10 file:text-celeste hover:file:bg-celeste/15 transition-all cursor-pointer bg-white/[0.03]"
            />
            {comprobanteFile && (
              <button
                type="button"
                onClick={() => {
                  setComprobanteFile(null);
                  if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
                }}
                className="shrink-0 p-2.5 text-red-400 hover:bg-red-500/15 hover:text-red-300 rounded-xl transition-colors"
                title="Eliminar archivo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <AsyncButton
            type="button"
            onClickAction={handleSubmit(onSubmit)}
            className="w-full bg-celeste py-3.5 text-marino font-bold rounded-xl shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={!isValid || !comprobanteFile}
          >
            Siguiente Paso
            <ChevronRight className="w-5 h-5" />
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}
