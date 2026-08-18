import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Users, ChevronRight, Trophy, X, Trash2, Shield } from 'lucide-react';
import { AsyncButton } from '../../../components/AsyncButton';
import { inscribirEquipoCompleto, finalizarBorradorInscripcion, desactivarEquipo } from '../api/equipos.api';
import { getTorneos } from '../../torneos/api/torneos.api';
import { getCategorias } from '../../categorias/api/categorias.api';
import { GestorPlantilla } from '../../plantillas/components/GestorPlantilla';
import { getPlantillas } from '../../plantillas/api/plantillas.api';
import type { Inscripcion, Categoria } from '../../../types/api.types';

const MAX_COMPROBANTE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024;        // 2 MB

const inscripcionSchema = z.object({
  torneo: z.string().min(1, 'Debes seleccionar un torneo'),
  nombreEquipo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  categoria: z.string().min(1, 'Debes seleccionar una categoría'),
});

type InscripcionValues = z.infer<typeof inscripcionSchema>;

// ── Modal de Confirmación de Envío ────────────────────────────────

interface ConfirmEnvioModalProps {
  isOpen: boolean;
  nombreEquipo: string;
  nombreTorneo: string;
  nombreCategoria: string;
  totalJugadores: number;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function ConfirmEnvioModal({
  isOpen,
  nombreEquipo,
  nombreTorneo,
  nombreCategoria,
  totalJugadores,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmEnvioModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Trophy className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Confirmar Inscripción</h3>
              <p className="text-xs text-gray-500 mt-0.5">Revisa los datos antes de enviar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Equipo</span>
              <span className="font-bold text-gray-900">{nombreEquipo}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Torneo</span>
              <span className="font-semibold text-gray-800">{nombreTorneo}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Categoría</span>
              <span className="font-semibold text-gray-800">{nombreCategoria}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Jugadores Registrados</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                <Users className="w-3.5 h-3.5" /> {totalJugadores} jugadores
              </span>
            </div>
          </div>

          {/* Validaciones reglamentarias previas */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Validaciones de Nómina Superadas:
            </p>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="text-emerald-500">✓</span> Mínimo reglamentario cumplido ({totalJugadores}/18 jugadores)
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="text-emerald-500">✓</span> Comprobante de pago adjunto
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="text-emerald-500">✓</span> Dorsales de camiseta únicos y asignados
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>Al confirmar, la inscripción pasará a estado <strong>Pendiente de Revisión</strong> y será enviada al Administrador para su aprobación oficial.</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <AsyncButton
            onClickAction={onConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold rounded-xl"
          >
            Sí, Enviar Inscripción
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}

// ── Wizard Principal ──────────────────────────────────────────────

interface InscripcionWizardProps {
  borradorExistente?: Inscripcion;
}

export function InscripcionWizard({ borradorExistente }: InscripcionWizardProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estado del wizard
  const [currentStep, setCurrentStep] = useState<1 | 2>(borradorExistente ? 2 : 1);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const comprobanteInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Datos de la inscripción creada al finalizar el Paso 1
  const [borradorData, setBorradorData] = useState<{
    idInscripcion: number;
    idEquipo: number;
    idTorneo: number;
    nombreEquipo: string;
    nombreTorneo: string;
    nombreCategoria: string;
    categoria?: Categoria | null;
  } | null>(() => {
    if (!borradorExistente) return null;
    const idInscripcion = borradorExistente.id_inscripcion || borradorExistente.id!;
    const idEquipo = borradorExistente.equipo?.id_equipo || borradorExistente.equipo?.id || borradorExistente.id_equipo;
    const idTorneo = borradorExistente.torneo?.id_torneo || borradorExistente.torneo?.id || borradorExistente.id_torneo;
    const nombreEquipo = borradorExistente.equipo?.nombre_equipo || borradorExistente.equipo?.nombre || 'Equipo';
    const nombreTorneo = borradorExistente.torneo?.nombre_torneo || borradorExistente.torneo?.nombre || 'Torneo';
    const nombreCategoria = borradorExistente.categoria
      ? `${borradorExistente.categoria.nombre_categoria || borradorExistente.categoria.nombre} (${borradorExistente.categoria.genero_categoria})`
      : 'Categoría';

    return {
      idInscripcion,
      idEquipo,
      idTorneo,
      nombreEquipo,
      nombreTorneo,
      nombreCategoria,
      categoria: borradorExistente.categoria,
    };
  });

  const { data: torneosRes, isLoading: isLoadingTorneos } = useQuery({
    queryKey: ['torneos_activos'],
    queryFn: () => getTorneos(1, 100),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<InscripcionValues>({
    resolver: zodResolver(inscripcionSchema),
    defaultValues: { torneo: '', nombreEquipo: '', categoria: '' },
    mode: 'onChange',
  });

  const selectedTorneo = watch('torneo');

  const { data: categoriasRes, isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias', selectedTorneo],
    queryFn: () => getCategorias(1, 100, Number(selectedTorneo)),
    enabled: !!selectedTorneo,
  });

  const torneos = torneosRes?.data?.filter(t => t.estado === 'en_curso' || t.estado === 'programado') || [];
  const categorias = categoriasRes?.data || [];

  // Cuando cambie el torneo, resetear la categoría
  useEffect(() => {
    setValue('categoria', '');
  }, [selectedTorneo, setValue]);

  // Mutación para finalizar borrador (Paso 2 → Pendiente)
  const finalizarMutation = useMutation({
    mutationFn: () => finalizarBorradorInscripcion(borradorData!.idInscripcion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
      toast.success('¡Inscripción enviada! El administrador revisará tu solicitud próximamente.');
      navigate('/delegado/dashboard');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al enviar la inscripción.';
      toast.error(msg);
    },
  });

  // ── Paso 1: Crear borrador ────────────────────────────────────

  const handlePaso1 = async (data: InscripcionValues) => {
    if (!comprobanteFile) {
      toast.error('Debes seleccionar un archivo para el comprobante.');
      return;
    }
    if (comprobanteFile.size > MAX_COMPROBANTE_SIZE) {
      toast.error('El comprobante excede el tamaño máximo permitido (5 MB).');
      return;
    }
    if (logoFile && logoFile.size > MAX_LOGO_SIZE) {
      toast.error('El logo excede el tamaño máximo permitido (2 MB).');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('nombre_equipo', data.nombreEquipo);
      formData.append('id_torneo', data.torneo);
      formData.append('id_categoria', data.categoria);
      formData.append('archivo', comprobanteFile);
      if (logoFile) formData.append('logo', logoFile);

      const res = await inscribirEquipoCompleto(formData);
      const inscripcion = res.data as Inscripcion;

      const torneoSeleccionado = torneos.find(t => String(t.id_torneo || t.id) === data.torneo);
      const categoriaSeleccionada = categorias.find(c => String(c.id_categoria || c.id) === data.categoria);

      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });

      setBorradorData({
        idInscripcion: inscripcion.id_inscripcion!,
        idEquipo: inscripcion.id_equipo,
        idTorneo: inscripcion.id_torneo,
        nombreEquipo: data.nombreEquipo,
        nombreTorneo: torneoSeleccionado?.nombre_torneo || torneoSeleccionado?.nombre || 'Torneo',
        nombreCategoria: categoriaSeleccionada
          ? `${categoriaSeleccionada.nombre_categoria || categoriaSeleccionada.nombre} (${categoriaSeleccionada.genero_categoria})`
          : 'Categoría',
        categoria: categoriaSeleccionada || inscripcion.categoria,
      });

      setCurrentStep(2);
      toast.success('Datos del equipo guardados. Ahora registra los jugadores de tu equipo.');
    } catch (error: any) {
      let message = error?.response?.data?.message || 'Error al procesar la inscripción';
      if (message.toLowerCase().includes('logo') && message.toLowerCase().includes('tamaño')) {
        message = 'El logo excede el tamaño máximo permitido (2 MB).';
      } else if (message.toLowerCase().includes('tamaño')) {
        message = 'El comprobante excede el tamaño máximo permitido (5 MB).';
      }
      toast.error(message);
    }
  };

  // ── Paso 2: Finalizar inscripción ────────────────────────────────

  const handleFinalizarInscripcion = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmEnvio = async () => {
    setShowConfirmModal(false);
    await finalizarMutation.mutateAsync();
  };

  // ── Indicador de Pasos ──────────────────────────────────────────

  const StepIndicator = () => {
    const isStep2 = currentStep === 2;

    return (
      <div className="flex items-center justify-center my-4 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {/* Paso 1 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isStep2
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                  : 'bg-primary-600 text-white shadow-sm ring-4 ring-primary-50'
              }`}
            >
              {isStep2 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                isStep2 ? 'text-emerald-700' : 'text-primary-700'
              }`}
            >
              1. Datos del Equipo
            </span>
          </div>

          {/* Línea conectora */}
          <div
            className={`w-12 sm:w-20 h-0.5 transition-colors ${
              isStep2 ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          />

          {/* Paso 2 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isStep2
                  ? 'bg-primary-600 text-white shadow-sm ring-4 ring-primary-50'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                isStep2 ? 'text-primary-700' : 'text-gray-400'
              }`}
            >
              2. Registro de Jugadores
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────

  const { data: plantillasRes } = useQuery({
    queryKey: ['plantillas', borradorData?.idEquipo],
    queryFn: () => getPlantillas(borradorData!.idEquipo),
    enabled: !!borradorData?.idEquipo,
  });
  const totalJugadores = plantillasRes?.data?.length || 0;

  if (currentStep === 2 && borradorData) {
    return (
      <div className="w-full flex flex-col gap-5">
        {/* Cabecera Paso 2 */}
        <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
              <span>Inscripción</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-800 font-semibold">{borradorData.nombreEquipo}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Paso 2 — Registro de Jugadores</h1>
            <p className="text-xs text-gray-500 mt-1">
              Registra entre 10 y 18 jugadores. Cuando completes el mínimo de 10, se habilitará el botón de envío.
            </p>
          </div>
          
          <AsyncButton
            onClickAction={async () => {
              if (window.confirm("¿Estás seguro de descartar esta inscripción? Se borrarán todos los datos ingresados y tendrás que empezar de nuevo.")) {
                try {
                  await desactivarEquipo(borradorData.idEquipo);
                  queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
                  setBorradorData(null);
                  setCurrentStep(1);
                  toast.success('Inscripción descartada correctamente.');
                } catch (error) {
                  toast.error('Error al descartar la inscripción.');
                }
              }
            }}
            className="inline-flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" /> Descartar y volver
          </AsyncButton>
        </div>

        {/* Info del equipo */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 max-w-4xl w-full mx-auto">
          <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-5 py-2.5 rounded-xl font-black border border-blue-200 text-base shadow-sm">
            <Shield className="w-5 h-5 text-blue-600" /> Equipo: {borradorData.nombreEquipo}
          </span>
          <span className="inline-flex items-center gap-2 bg-primary-50 text-primary-800 px-5 py-2.5 rounded-xl font-bold border border-primary-200 text-base shadow-sm">
            <Trophy className="w-5 h-5 text-primary-600" /> Torneo: {borradorData.nombreTorneo}
          </span>
          <span className="inline-flex items-center gap-2 bg-gray-50 text-gray-800 px-5 py-2.5 rounded-xl font-bold border border-gray-200 text-base shadow-sm">
            Categoría: {borradorData.nombreCategoria}
          </span>
        </div>

        <StepIndicator />

        {/* GestorPlantilla en modo wizard */}
        <GestorPlantilla
          idEquipoOverride={borradorData.idEquipo}
          idTorneoOverride={borradorData.idTorneo}
          categoriaOverride={borradorData.categoria}
          mode="wizard"
          onFinalizarInscripcion={handleFinalizarInscripcion}
          isSubmittingInscripcion={finalizarMutation.isPending}
          nombreEquipo={borradorData.nombreEquipo}
          nombreTorneo={borradorData.nombreTorneo}
          nombreCategoria={borradorData.nombreCategoria}
        />

        {/* Modal de confirmación */}
        <ConfirmEnvioModal
          isOpen={showConfirmModal}
          nombreEquipo={borradorData.nombreEquipo}
          nombreTorneo={borradorData.nombreTorneo}
          nombreCategoria={borradorData.nombreCategoria}
          totalJugadores={totalJugadores}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmEnvio}
          isLoading={finalizarMutation.isPending}
        />
      </div>
    );
  }

  // Paso 1
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <StepIndicator />
      <h2 className="text-xl font-bold text-gray-900">Paso 1 — Datos del Equipo</h2>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        Completa los campos y adjunta el comprobante de pago. Al continuar crearemos el borrador de tu inscripción.
      </p>

      <form onSubmit={handleSubmit(handlePaso1)} className="space-y-4">
        {/* Torneo */}
        <div>
          <label htmlFor="torneo" className="mb-1 block text-sm font-medium text-gray-700">
            Torneo <span className="text-red-500">*</span>
          </label>
          <select
            id="torneo"
            {...register('torneo')}
            disabled={isLoadingTorneos}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">Selecciona un torneo...</option>
            {torneos.map((t) => (
              <option key={t.id_torneo || t.id} value={t.id_torneo || t.id}>
                {t.nombre_torneo || t.nombre}
              </option>
            ))}
          </select>
          {errors.torneo && <p className="mt-1 text-xs text-red-500">{errors.torneo.message}</p>}
        </div>

        {/* Nombre del Equipo */}
        <div>
          <label htmlFor="nombreEquipo" className="mb-1 block text-sm font-medium text-gray-700">
            Nombre del Equipo <span className="text-red-500">*</span>
          </label>
          <input
            id="nombreEquipo"
            type="text"
            placeholder="Ej. Los Halcones"
            {...register('nombreEquipo')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.nombreEquipo && (
            <p className="mt-1 text-xs text-red-500">{errors.nombreEquipo.message}</p>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-gray-700">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            id="categoria"
            {...register('categoria')}
            disabled={!selectedTorneo || isLoadingCategorias}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">Selecciona una categoría...</option>
            {categorias.map((c) => (
              <option key={c.id_categoria || c.id} value={c.id_categoria || c.id}>
                {c.nombre_categoria || c.nombre} ({c.genero_categoria})
              </option>
            ))}
          </select>
          {errors.categoria && <p className="mt-1 text-xs text-red-500">{errors.categoria.message}</p>}
        </div>

        {/* Comprobante de Pago */}
        <div>
          <label htmlFor="comprobante" className="mb-1 block text-sm font-medium text-gray-700">
            Comprobante de Pago <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-gray-500">
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {comprobanteFile && (
              <button
                type="button"
                onClick={() => {
                  setComprobanteFile(null);
                  if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
                }}
                className="shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar archivo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Logo del Equipo (Opcional) */}
        <div>
          <label htmlFor="logo" className="mb-1 block text-sm font-medium text-gray-700">
            Logo del Equipo (Opcional)
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Tamaño máximo permitido: 2 MB. (JPG, PNG, WebP)
          </p>
          <div className="flex items-center gap-2">
            <input
              id="logo"
              type="file"
              ref={logoInputRef}
              accept=".jpg, .jpeg, .png, .webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > MAX_LOGO_SIZE) {
                    toast.error('El logo excede el tamaño máximo permitido (2 MB).');
                    e.target.value = '';
                    setLogoFile(null);
                    return;
                  }
                  setLogoFile(file);
                } else {
                  setLogoFile(null);
                }
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {logoFile && (
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null);
                  if (logoInputRef.current) logoInputRef.current.value = '';
                }}
                className="shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar logo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-5">
          <AsyncButton
            type="button"
            onClickAction={handleSubmit(handlePaso1)}
            className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={!isValid || !comprobanteFile}
          >
            Continuar a Registro de Jugadores
            <ChevronRight className="w-4 h-4" />
          </AsyncButton>
          {!comprobanteFile && (
            <p className="mt-2 text-center text-xs text-gray-400">Adjunta el comprobante de pago para continuar</p>
          )}
        </div>
      </form>
    </div>
  );
}
