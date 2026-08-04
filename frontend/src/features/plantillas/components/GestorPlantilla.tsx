import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  X, 
  Trash2, 
  Image as ImageIcon, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  RotateCcw, 
  Info,
  Pencil,
  Phone,
  Mail,
  Users,
  AlertCircle,
  Send,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { AsyncButton } from '../../../components/AsyncButton';
import { useAuth } from '../../../context/AuthContext';
import { 
  getPlantillas, 
  createJugador, 
  createPlantilla, 
  uploadFotoJugador, 
  uploadCedulaJugador, 
  uploadActaJugador, 
  buscarJugadorPorCedula, 
  deletePlantilla,
  updateNumeroCamiseta
} from '../api/plantillas.api';
import { getInscripciones } from '../../equipos/api/equipos.api';
import { getSanciones } from '../../sanciones/api/sanciones.api';
import type { Plantilla, Jugador, Categoria } from '../../../types/api.types';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { ConfirmarJugadorModal } from './ConfirmarJugadorModal';
import { EditarCamisetaModal } from './EditarCamisetaModal';
import { ConfirmarEliminarJugadorModal } from './ConfirmarEliminarJugadorModal';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const MIN_JUGADORES = 1;
const MAX_JUGADORES = 18;

const jugadorSchema = z.object({
  documento_identificacion: z.string()
    .length(10, 'La cédula debe tener exactamente 10 dígitos')
    .regex(/^\d+$/, 'Solo se permiten dígitos numéricos'),
  nombre: z.string()
    .min(3, 'Nombres y apellidos requeridos')
    .regex(/^[^0-9]+$/, 'No se permiten números en nombres y apellidos'),
  fecha_nacimiento: z.string().min(1, 'Fecha requerida'),
  numero_camiseta: z.number({ message: 'Número requerido' })
    .int('Debe ser un número entero')
    .min(0, 'Mínimo 0')
    .max(99, 'Máximo 99'),
  telefono: z.string()
    .length(10, 'El teléfono debe tener exactamente 10 dígitos')
    .regex(/^\d+$/, 'Solo se permiten dígitos numéricos'),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
});
type JugadorFormValues = z.infer<typeof jugadorSchema>;

export function calculateExactAge(birthDateString?: string): number | null {
  if (!birthDateString) return null;
  const parts = birthDateString.split('-');
  if (parts.length < 1) return null;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return null;
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return age >= 0 ? age : null;
}

function calculateAgeYears(birthDateString?: string): number | null {
  return calculateExactAge(birthDateString);
}

function formatDate(fechaStr?: string): string {
  if (!fechaStr) return '-';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fechaStr;
}

function formatPhone(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
}

export interface GestorPlantillaProps {
  /** Sobreescribe el id_equipo detectado desde la inscripción activa (usado en modo wizard) */
  idEquipoOverride?: number;
  /** Sobreescribe el id_torneo detectado desde la inscripción activa (usado en modo wizard) */
  idTorneoOverride?: number;
  /** Sobreescribe o pasa la categoría activa para validación estricta de edad */
  categoriaOverride?: Categoria | null;
  /** En modo wizard se muestra el banner de envio de inscripcion en la parte inferior */
  mode?: 'standalone' | 'wizard';
  /** Callback que se llama cuando el delegado pulsa "Inscribir Equipo" en el modo wizard */
  onFinalizarInscripcion?: () => void;
  /** Indica si la mutacion de envio esta en progreso (para deshabilitar el boton) */
  isSubmittingInscripcion?: boolean;
  /** Nombre del equipo para mostrar en el banner del wizard */
  nombreEquipo?: string;
  /** Nombre del torneo para mostrar en el banner del wizard */
  nombreTorneo?: string;
  /** Nombre de la categoria para mostrar en el banner del wizard */
  nombreCategoria?: string;
}

export function GestorPlantilla({
  idEquipoOverride,
  idTorneoOverride,
  categoriaOverride,
  mode = 'standalone',
  onFinalizarInscripcion,
  isSubmittingInscripcion = false,
  nombreEquipo: _nombreEquipo,
  nombreTorneo: _nombreTorneo,
  nombreCategoria: _nombreCategoria,
}: GestorPlantillaProps = {}) {
  const [showForm, setShowForm] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [actaFile, setActaFile] = useState<File | null>(null);

  const fotoInputRef = useRef<HTMLInputElement>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const actaInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const [selectedJugadorId, setSelectedJugadorId] = useState<number | null>(null);
  
  const [detectedPlayer, setDetectedPlayer] = useState<Jugador | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExistingPlayer, setIsExistingPlayer] = useState(false);
  const [isCheckingCedula, setIsCheckingCedula] = useState(false);
  const [lastCheckedCedula, setLastCheckedCedula] = useState<string>('');
  const [yaEnTorneo, setYaEnTorneo] = useState<boolean>(false);
  const [equipoTorneo, setEquipoTorneo] = useState<string | null>(null);

  const [isEditingDorsal, setIsEditingDorsal] = useState(false);
  const [selectedPlantillaForDorsal, setSelectedPlantillaForDorsal] = useState<Plantilla | null>(null);
  const [isSavingDorsal, setIsSavingDorsal] = useState(false);
  const [deletingPlantilla, setDeletingPlantilla] = useState<Plantilla | null>(null);
  const [isDeletingPlantilla, setIsDeletingPlantilla] = useState(false);

  const queryClient = useQueryClient();
  const { activeTeamId } = useAuth();

  const isWizardMode = mode === 'wizard';

  const { data: inscripcionesRes, isLoading: isLoadingInscripciones } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
    // En modo wizard el idEquipoOverride ya es conocido, pero igual cargamos para contexto
    enabled: !idEquipoOverride,
  });
  
  const inscripciones = inscripcionesRes?.data || [];
  const inscripcion = activeTeamId 
    ? inscripciones.find(i => (i.equipo?.id_equipo || i.equipo?.id) === activeTeamId)
    : (inscripciones.length === 1 ? inscripciones[0] : null);
  const idEquipo = idEquipoOverride ?? (inscripcion?.equipo?.id_equipo || inscripcion?.id_equipo);
  const idTorneo = idTorneoOverride ?? (inscripcion?.torneo?.id_torneo || inscripcion?.id_torneo);
  const categoriaActiva = categoriaOverride || inscripcion?.categoria;

  const { data: plantillasRes, isLoading: isLoadingPlantilla, isError } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo),
    enabled: !!idEquipo,
  });
  const plantilla = plantillasRes?.data || [];

  const { data: sancionesRes } = useQuery({
    queryKey: ['sanciones-activas-liga'],
    queryFn: () => getSanciones(undefined, 'activa'),
  });
  const amonestacionesActivas = sancionesRes?.data || [];

  const defaultFormValues: JugadorFormValues = {
    documento_identificacion: '',
    nombre: '',
    fecha_nacimiento: '',
    numero_camiseta: '' as any,
    telefono: '',
    correo: '',
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isValid } } = useForm<JugadorFormValues>({
    resolver: zodResolver(jugadorSchema),
    mode: 'onChange',
    defaultValues: defaultFormValues,
  });

  const fechaNacimientoWatch = watch('fecha_nacimiento');
  const documentoWatch = watch('documento_identificacion');
  const numeroCamisetaWatch = watch('numero_camiseta');

  const dorsalDuplicado = useMemo(() => {
    if (numeroCamisetaWatch === undefined || numeroCamisetaWatch === null || isNaN(numeroCamisetaWatch)) return null;
    const num = Number(numeroCamisetaWatch);
    const existente = plantilla.find(p => p.numero_camiseta === num);
    if (existente) {
      const nombreJugador = existente.jugador?.nombre || 'otro jugador';
      return `El dorsal #${num} ya está asignado a "${nombreJugador}" en este equipo.`;
    }
    return null;
  }, [numeroCamisetaWatch, plantilla]);

  const edadCalculada = useMemo(() => {
    return calculateExactAge(fechaNacimientoWatch);
  }, [fechaNacimientoWatch]);

  const errorEdad = useMemo(() => {
    if (!fechaNacimientoWatch || edadCalculada === null || !categoriaActiva) return null;

    const edadMin = categoriaActiva.edad_minima ?? 0;
    const edadMax = categoriaActiva.edad_maxima;
    const nombreCat = categoriaActiva.nombre_categoria || categoriaActiva.nombre || 'esta categoría';

    if (edadCalculada < edadMin) {
      return `El jugador tiene ${edadCalculada} años y no cumple con la edad mínima de ${edadMin} años para la categoría "${nombreCat}".`;
    }

    if (edadMax !== null && edadMax !== undefined && edadCalculada > edadMax) {
      return `El jugador tiene ${edadCalculada} años y supera la edad máxima de ${edadMax} años para la categoría "${nombreCat}".`;
    }

    return null;
  }, [fechaNacimientoWatch, edadCalculada, categoriaActiva]);

  const onlyDigits = (e: React.ChangeEvent<HTMLInputElement>, maxLen: number) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, maxLen);
  };

  const noDigits = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[0-9]/g, '');
  };

  const handleClearForm = () => {
    reset(defaultFormValues);
    setValue('documento_identificacion', '');
    setValue('nombre', '');
    setValue('fecha_nacimiento', '');
    setValue('numero_camiseta', '' as any);
    setValue('telefono', '');
    setValue('correo', '');
    setFotoFile(null);
    setCedulaFile(null);
    setActaFile(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
    if (cedulaInputRef.current) cedulaInputRef.current.value = '';
    if (actaInputRef.current) actaInputRef.current.value = '';
    setDetectedPlayer(null);
    setIsExistingPlayer(false);
    setLastCheckedCedula('');
    setYaEnTorneo(false);
    setEquipoTorneo(null);
  };

  const handlePreFinalizar = () => {
    if (plantilla.length < MIN_JUGADORES) {
      toast.error(`Se requiere un mínimo de ${MIN_JUGADORES} jugadores registrados.`);
      return;
    }
    if (plantilla.length > MAX_JUGADORES) {
      toast.error(`Se permite un máximo de ${MAX_JUGADORES} jugadores.`);
      return;
    }
    // Validar dorsales únicos en el roster
    const dorsales = plantilla
      .map(p => p.numero_camiseta)
      .filter((d): d is number => d !== null && d !== undefined);
    const dorsalesDuplicados = dorsales.filter((item, index) => dorsales.indexOf(item) !== index);
    if (dorsalesDuplicados.length > 0) {
      toast.error(`Existen números de camiseta duplicados (ej. dorsal #${dorsalesDuplicados[0]}). Cada jugador debe tener un número único.`);
      return;
    }
    if (onFinalizarInscripcion) {
      onFinalizarInscripcion();
    }
  };

  const handleResetForm = () => {
    handleClearForm();
    setShowForm(false);
  };

  const handleVerificarCedula = async (cedulaValue?: string) => {
    const cedula = (cedulaValue || documentoWatch || '').trim();
    if (cedula.length !== 10 || isExistingPlayer || isCheckingCedula || cedula === lastCheckedCedula) return;

    try {
      setIsCheckingCedula(true);
      setLastCheckedCedula(cedula);
      const res = await buscarJugadorPorCedula(cedula, idTorneo);
      if (res.data) {
        setDetectedPlayer(res.data);
        setYaEnTorneo(!!res.data.ya_en_torneo);
        setEquipoTorneo(res.data.equipo_torneo || null);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingCedula(false);
    }
  };

  const handleModalAceptar = () => {
    if (!detectedPlayer) return;

    if (plantilla.length >= MAX_JUGADORES) {
      toast.error(`El equipo ya ha alcanzado el límite máximo de ${MAX_JUGADORES} jugadores.`);
      setIsModalOpen(false);
      return;
    }

    setValue('documento_identificacion', detectedPlayer.documento_identificacion);
    setValue('nombre', detectedPlayer.nombre || '');
    setValue('fecha_nacimiento', detectedPlayer.fecha_nacimiento);
    setValue('telefono', detectedPlayer.telefono || '');
    setValue('correo', detectedPlayer.correo || '');

    setIsExistingPlayer(true);
    setIsModalOpen(false);
    toast.info('Datos autocompletados. Ahora asigna el número de camiseta.');
  };

  const handleModalCancelar = () => {
    setIsModalOpen(false);
    setDetectedPlayer(null);
    setYaEnTorneo(false);
    setEquipoTorneo(null);
    setValue('documento_identificacion', '');
    setLastCheckedCedula('');
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    tipoNombre: string,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      toast.error(`Formato inválido para ${tipoNombre.toLowerCase()}. Formatos aceptados: ${allowedTypes.map(t => t.split('/')[1]?.toUpperCase() || t).join(', ')}`);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${tipoNombre} excede el tamaño máximo permitido de 4 MB.`);
      e.target.value = '';
      return;
    }
    setter(file);
  };

  const onSubmit = async (data: JugadorFormValues) => {
    if (!idEquipo || !idTorneo) {
      toast.error('No se pudo identificar el equipo o torneo activo.');
      return;
    }

    if (plantilla.length >= MAX_JUGADORES) {
      toast.error(`El equipo ya ha alcanzado el límite máximo de ${MAX_JUGADORES} jugadores en la plantilla.`);
      return;
    }

    if (errorEdad) {
      toast.error(errorEdad);
      return;
    }

    try {
      let idJugador: number;

      if (isExistingPlayer && detectedPlayer) {
        idJugador = (detectedPlayer.id_jugador || detectedPlayer.id || 0);

        // Subir archivos nuevos si fueron seleccionados
        if (fotoFile) {
          try { await uploadFotoJugador(idJugador, fotoFile); } catch (e) { console.error(e); }
        }
        if (cedulaFile) {
          try { await uploadCedulaJugador(idJugador, cedulaFile); } catch (e) { console.error(e); }
        }
        if (actaFile) {
          try { await uploadActaJugador(idJugador, actaFile); } catch (e) { console.error(e); }
        }

        await createPlantilla({
          id_jugador: idJugador,
          id_equipo: idEquipo,
          id_torneo: idTorneo,
          numero_camiseta: data.numero_camiseta,
        });

        toast.success('Jugador vinculado a la plantilla exitosamente.');
      } else {
        const payload = {
          nombre: data.nombre.trim(),
          documento_identificacion: data.documento_identificacion,
          fecha_nacimiento: data.fecha_nacimiento,
          telefono: data.telefono === "" ? undefined : data.telefono,
          correo: data.correo === "" ? undefined : data.correo,
        };

        const jugadorRes = await createJugador(payload);
        if (!jugadorRes.data) throw new Error('Error al crear jugador');
        idJugador = jugadorRes.data.id_jugador || jugadorRes.data.id;

        // Subida de archivos en paralelo/secuencia
        if (fotoFile) {
          try { await uploadFotoJugador(idJugador, fotoFile); } catch (e) { console.error(e); }
        }
        if (cedulaFile) {
          try { await uploadCedulaJugador(idJugador, cedulaFile); } catch (e) { console.error(e); }
        }
        if (actaFile) {
          try { await uploadActaJugador(idJugador, actaFile); } catch (e) { console.error(e); }
        }

        await createPlantilla({
          id_jugador: idJugador,
          id_equipo: idEquipo,
          id_torneo: idTorneo,
          numero_camiseta: data.numero_camiseta,
        });

        toast.success('Jugador registrado y añadido a la plantilla exitosamente.');
      }

      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
      handleClearForm();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.data) {
        setDetectedPlayer(error.response.data.data);
        setYaEnTorneo(!!error.response.data.data.ya_en_torneo);
        setEquipoTorneo(error.response.data.data.equipo_torneo || null);
        setIsModalOpen(true);
        return;
      }

      let message = error.response?.data?.message || error.response?.data?.errors || error.message || 'Ocurrió un error al procesar el jugador.';
      if (typeof message === 'object' && message !== null) {
        try {
          message = Object.entries(message)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        } catch (e) {
          message = JSON.stringify(message);
        }
      }
      toast.error(String(message));
    }
  };

  const handleOpenEliminarModal = (row: Plantilla) => {
    setDeletingPlantilla(row);
  };

  const handleConfirmEliminarPlantilla = async () => {
    if (!deletingPlantilla) return;
    const idPlantilla = deletingPlantilla.id_plantilla || deletingPlantilla.id || 0;
    setIsDeletingPlantilla(true);
    try {
      await deletePlantilla(idPlantilla);
      toast.success('Jugador eliminado de la plantilla.');
      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
      setDeletingPlantilla(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar jugador.');
    } finally {
      setIsDeletingPlantilla(false);
    }
  };

  const handleUploadFotoDirecta = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedJugadorId) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('La foto excede el tamaño máximo permitido (4 MB).');
      return;
    }

    try {
      await uploadFotoJugador(selectedJugadorId, file);
      toast.success('Foto actualizada exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al actualizar la foto.';
      toast.error(message);
    } finally {
      if (hiddenFileInput.current) {
        hiddenFileInput.current.value = '';
      }
      setSelectedJugadorId(null);
    }
  };

  const handleClickActualizarFoto = (idJugador: number) => {
    setSelectedJugadorId(idJugador);
    hiddenFileInput.current?.click();
  };

  const handleOpenEditarCamiseta = (row: Plantilla) => {
    setSelectedPlantillaForDorsal(row);
    setIsEditingDorsal(true);
  };

  const handleSaveEditarCamiseta = async (nuevoDorsal: number) => {
    if (!selectedPlantillaForDorsal) return;
    const idPlantilla = selectedPlantillaForDorsal.id_plantilla || selectedPlantillaForDorsal.id || 0;

    setIsSavingDorsal(true);
    try {
      await updateNumeroCamiseta(idPlantilla, nuevoDorsal);
      toast.success('Número de camiseta actualizado exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
      setIsEditingDorsal(false);
      setSelectedPlantillaForDorsal(null);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al actualizar el número de camiseta.';
      toast.error(message);
    } finally {
      setIsSavingDorsal(false);
    }
  };

  const columns: Column<Plantilla>[] = [
    { 
      key: 'jugador', 
      header: 'Jugador', 
      headerClassName: 'min-w-[140px]',
      render: (row) => {
        const fotoUrl = row.jugador?.url_foto;
        const inicial = row.jugador?.nombre?.charAt(0) || '?';
        const idJugador = row.jugador?.id_jugador || row.jugador?.id || row.id_jugador;
        const amonestado = amonestacionesActivas.some(s => s.id_jugador === idJugador);
        return (
          <div className="flex items-center gap-2.5">
            {fotoUrl ? (
              <img src={fotoUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-gray-100 border border-gray-200 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs uppercase border border-primary-200 shrink-0">
                {inicial}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-gray-900 flex items-center gap-1 text-xs sm:text-sm truncate max-w-[130px] xl:max-w-[180px]" title={row.jugador?.nombre}>
                {row.jugador?.nombre}
                {amonestado && (
                  <span title="Jugador con faltas o amonestaciones activas">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                  </span>
                )}
              </span>
              <span className="text-[11px] text-gray-500">C.I. {row.jugador?.documento_identificacion}</span>
            </div>
          </div>
        );
      }
    },
    { 
      key: 'numero_camiseta', 
      header: 'Camiseta', 
      headerClassName: 'text-center w-16 xl:w-20',
      cellClassName: 'text-center',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenEditarCamiseta(row)}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 px-2 py-0.5 text-xs font-bold text-gray-800 border border-gray-200 transition-all cursor-pointer group"
          title="Clic para modificar número de camiseta"
        >
          <span>#{row.numero_camiseta ?? '-'}</span>
          <Pencil className="w-3 h-3 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </button>
      )
    },
    {
      key: 'edad',
      header: 'Edad / Fecha',
      headerClassName: 'w-20 xl:w-24',
      render: (row) => {
        const edad = calculateAgeYears(row.jugador?.fecha_nacimiento);
        const fecha = formatDate(row.jugador?.fecha_nacimiento);
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 text-xs">
              {edad !== null ? `${edad} años` : '-'}
            </span>
            <span className="text-[10px] text-gray-500">{fecha}</span>
          </div>
        );
      }
    },
    {
      key: 'contacto',
      header: 'Contacto',
      headerClassName: 'min-w-[110px] xl:min-w-[130px]',
      render: (row) => {
        const tel = row.jugador?.telefono;
        const mail = row.jugador?.correo;
        return (
          <div className="flex flex-col gap-0.5">
            {tel ? (
              <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                {formatPhone(tel)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Sin teléfono</span>
            )}
            {mail && (
              <span className="text-[11px] text-gray-500 flex items-center gap-1 truncate max-w-[110px] xl:max-w-[150px]" title={mail}>
                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                {mail}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      key: 'documentos', 
      header: 'Estado Docs', 
      headerClassName: 'min-w-[120px] xl:min-w-[140px]',
      render: (row) => {
        const hasCedula = !!row.jugador?.url_cedula;
        const hasActa = !!row.jugador?.url_acta_bachiller;
        const isComplete = hasCedula;

        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                isComplete
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Completo
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Falta Cédula
                </>
              )}
            </span>
            <div className="flex items-center gap-1">
              {hasCedula ? (
                <a 
                  href={row.jugador?.url_cedula} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Ver Cédula de Identidad"
                  className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-medium inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Cédula
                </a>
              ) : (
                <span className="text-[10px] text-gray-400">Sin cédula</span>
              )}
              {hasActa && (
                <a 
                  href={row.jugador?.url_acta_bachiller} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Ver Acta de Bachiller"
                  className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-[10px] font-medium inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Acta
                </a>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'acciones',
      header: 'Acciones',
      headerClassName: 'text-right w-20 xl:w-24',
      cellClassName: 'text-right',
      render: (row) => {
        const idPlantilla = row.id_plantilla || row.id || 0;
        const idJugador = row.jugador?.id_jugador || row.jugador?.id || row.id_jugador;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <button
              onClick={() => handleOpenEditarCamiseta(row)}
              className="text-gray-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-primary-50"
              title="Modificar Camiseta"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleClickActualizarFoto(idJugador)}
              className="text-gray-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              title="Actualizar Foto de Perfil"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleOpenEliminarModal(row)}
              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
              title="Quitar del Roster"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    }
  ];

  const isLoading = isLoadingInscripciones || isLoadingPlantilla;
  const totalJugadores = plantilla.length;
  const isMaxReached = totalJugadores >= MAX_JUGADORES;
  const isMinReached = totalJugadores >= MIN_JUGADORES;
  const faltantesMinimo = Math.max(0, MIN_JUGADORES - totalJugadores);
  const porcentajeCapacidad = Math.min(100, Math.round((totalJugadores / MAX_JUGADORES) * 100));

  if (!isWizardMode) {
    if (isLoadingInscripciones) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      );
    }

    if (inscripciones.length === 0) {
      return (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm flex flex-col items-center">
          <div className="p-3 bg-gray-100 text-gray-500 rounded-2xl mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin Equipos Registrados</h2>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            Aún no tienes ningún equipo registrado. Inicia el proceso de inscripción para armar tu plantilla.
          </p>
          <Link
            to="/delegado/inscripcion"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            Inscribir un Equipo
          </Link>
        </div>
      );
    }

    if (inscripciones.length > 1 && !activeTeamId) {
      return (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm flex flex-col items-center">
          <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Selecciona un Equipo</h2>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            Tienes varios equipos registrados. Para gestionar la nómina de jugadores, primero debes elegir cuál equipo deseas administrar en tu panel.
          </p>
          <Link
            to="/delegado/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            Ir al Panel de Equipos
          </Link>
        </div>
      );
    }

    if (inscripcion && (inscripcion.estado_inscripcion !== 'aprobado' && inscripcion.estado !== 'aprobado')) {
      const isPendiente = (inscripcion.estado_inscripcion === 'pendiente' || inscripcion.estado === 'pendiente');
      const isBorrador = (inscripcion.estado_inscripcion === 'borrador' || inscripcion.estado === 'borrador');
      return (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-amber-200 bg-amber-50/40 text-center shadow-sm flex flex-col items-center">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isPendiente ? 'Inscripción en Revisión' : isBorrador ? 'Inscripción en Borrador' : 'Inscripción No Aprobada'}
          </h2>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            {isPendiente 
              ? 'La gestión de la plantilla oficial estará disponible una vez que el administrador evalúe y apruebe la inscripción de tu equipo.'
              : isBorrador
                ? 'Tu equipo se encuentra en borrador. Completa y envía tu solicitud desde el formulario de inscripción.'
                : 'La gestión de la plantilla oficial solo está habilitada para equipos con inscripción aprobada.'}
          </p>
          <Link
            to="/delegado/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
          >
            Volver al Panel
          </Link>
        </div>
      );
    }
  }

  return (
    <div className={`w-full transition-all duration-300 ${isWizardMode ? 'w-full' : 'max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6'} flex flex-col gap-5`}>
      <input 
        type="file" 
        ref={hiddenFileInput} 
        onChange={handleUploadFotoDirecta} 
        style={{ display: 'none' }} 
        accept="image/jpeg, image/png, image/webp" 
      />

      {/* Título de la Página — ocultamos en modo wizard (el wizard tiene su propio encabezado) */}
      {!isWizardMode && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Jugadores</h1>
          <p className="text-xs text-gray-500">
            Visualiza tu roster y registra nuevos perfiles para evaluación técnica.
          </p>
        </div>
      )}

      {/* Tarjeta Resumen de Cupos y Regulación (Min 10 - Max 18) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-4.5 shadow-sm flex flex-col gap-3 max-w-4xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isMaxReached 
                ? 'bg-blue-50 text-blue-600' 
                : isMinReached 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-amber-50 text-amber-600'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Cupo de Plantilla: {totalJugadores} / {MAX_JUGADORES}
                </h3>
                {isMaxReached ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cupo Lleno
                  </span>
                ) : isMinReached ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Roster Habilitado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Faltan {faltantesMinimo} para habilitar
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Reglamento oficial: Mínimo {MIN_JUGADORES} y máximo {MAX_JUGADORES} jugadores inscritos por equipo.
              </p>
            </div>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              disabled={!idEquipo || isMaxReached}
              title={isMaxReached ? `Se ha alcanzado el límite máximo de ${MAX_JUGADORES} jugadores` : 'Añadir nuevo jugador'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all sm:w-auto w-full justify-center shrink-0 ${
                isMaxReached 
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              {isMaxReached ? `Cupo Completo (${MAX_JUGADORES}/${MAX_JUGADORES})` : 'Añadir Jugador'}
            </button>
          )}
        </div>

        {/* Barra de Progreso */}
        <div className="w-full pt-1">
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                isMaxReached 
                  ? 'bg-blue-600' 
                  : isMinReached 
                    ? 'bg-emerald-500' 
                    : 'bg-amber-500'
              }`}
              style={{ width: `${porcentajeCapacidad}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1.5 font-medium">
            <span>0</span>
            <span>Mínimo {MIN_JUGADORES}</span>
            <span>Máximo {MAX_JUGADORES}</span>
          </div>
        </div>

        {/* Mensaje de advertencia si no cumple el mínimo */}
        {!isMinReached && totalJugadores > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Tu equipo cuenta con <strong>{totalJugadores} jugadores</strong>. Recuerda registrar al menos <strong>{MIN_JUGADORES} jugadores</strong> para que tu equipo esté formalmente habilitado a participar en los partidos del torneo.
            </span>
          </div>
        )}
      </div>

      {/* Header Superior del Roster */}
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${!showForm ? 'max-w-4xl w-full mx-auto' : 'w-full'}`}>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Roster del Equipo</h2>
          <p className="text-xs text-gray-500">Administra y registra a los jugadores oficiales en la plantilla de tu equipo.</p>
        </div>
      </div>

      {/* Layout Principal: 2 Columnas adaptativas si showForm está activo */}
      <div className={`w-full ${showForm ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 items-start' : ''}`}>
        
        {/* Columna Izquierda: Formulario Equilibrado */}
        {showForm && (
          <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm relative animate-fade-in">
            {/* Botones de acción superior: Limpiar y Cerrar */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <button 
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs font-medium"
                title="Limpiar campos del formulario"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
              <button 
                type="button"
                onClick={handleResetForm}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Cerrar formulario"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3.5 pr-20">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {isExistingPlayer ? 'Vincular Jugador Existente' : 'Registrar Nuevo Jugador'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isExistingPlayer 
                  ? 'Jugador verificado. Asigna la camiseta para integrarlo.'
                  : 'Ingresa los datos personales y documentos del jugador.'}
              </p>
            </div>

            {/* Banner de Categoría y Rango de Edad */}
            {categoriaActiva && (
              <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-medium truncate">
                  <Trophy className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">
                    <strong>Categoría:</strong> {categoriaActiva.nombre_categoria || categoriaActiva.nombre}
                    {categoriaActiva.genero_categoria ? ` (${categoriaActiva.genero_categoria})` : ''}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] self-start sm:self-auto shrink-0 shadow-2xs">
                  <span>Edad permitida:</span>
                  <span>
                    {categoriaActiva.edad_minima ?? 0}
                    {categoriaActiva.edad_maxima ? ` a ${categoriaActiva.edad_maxima} años` : ' años en adelante'}
                  </span>
                </div>
              </div>
            )}

            {/* Aviso superior de campos obligatorios */}
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Los campos con <span className="text-red-500 font-bold">*</span> son obligatorios.</span>
            </div>

            {isExistingPlayer && (
              <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Datos oficiales bloqueados para proteger el perfil.</span>
              </div>
            )}

            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              
              {/* Fila 1: Documento de Identidad + Camiseta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Doc. Identidad <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      maxLength={10}
                      placeholder="Ej. 1312345678"
                      {...register('documento_identificacion', {
                        onChange: (e) => {
                          onlyDigits(e, 10);
                          if (e.target.value.length === 10) {
                            handleVerificarCedula(e.target.value);
                          }
                        }
                      })}
                      onBlur={() => handleVerificarCedula()}
                      disabled={isExistingPlayer}
                      className={`w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
                        isExistingPlayer 
                          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                      }`} 
                    />
                    {isCheckingCedula && (
                      <div className="absolute right-3 top-2.5">
                        <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {errors.documento_identificacion && (
                    <p className="mt-1 text-xs text-red-600">{errors.documento_identificacion.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    N° Camiseta <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input 
                    type="number" 
                    min={0}
                    max={99}
                    placeholder="Ej. 23"
                    {...register('numero_camiseta', { valueAsNumber: true })} 
                    className={`w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
                      dorsalDuplicado
                        ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                    }`} 
                  />
                  {errors.numero_camiseta && <p className="mt-1 text-xs text-red-600">{errors.numero_camiseta.message}</p>}
                  {dorsalDuplicado && !errors.numero_camiseta && (
                    <p className="mt-1 text-xs text-red-600 font-medium animate-fade-in">{dorsalDuplicado}</p>
                  )}
                </div>
              </div>

              {/* Fila 2: Nombres y Apellidos */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Nombres y Apellidos <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Juan Pérez"
                  {...register('nombre', {
                    onChange: (e) => noDigits(e)
                  })} 
                  disabled={isExistingPlayer}
                  className={`w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
                    isExistingPlayer 
                      ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                      : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                  }`} 
                />
                {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              {/* Fila 3: Fecha de Nacimiento y Edad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Fecha Nacimiento <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input 
                    type="date" 
                    {...register('fecha_nacimiento')} 
                    disabled={isExistingPlayer}
                    className={`w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
                      isExistingPlayer 
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                        : errorEdad
                          ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                    }`} 
                  />
                  {errors.fecha_nacimiento && <p className="mt-1 text-xs text-red-600">{errors.fecha_nacimiento.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Edad Calculada</label>
                  <input 
                    type="text" 
                    readOnly
                    value={edadCalculada !== null ? `${edadCalculada} años` : ''} 
                    placeholder="Autocalculada"
                    className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold cursor-not-allowed transition-colors ${
                      errorEdad 
                        ? 'border-red-300 bg-red-50 text-red-700' 
                        : edadCalculada !== null 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-gray-100 text-gray-600'
                    }`} 
                  />
                </div>
              </div>

              {/* Mensaje reactivo de validación de edad */}
              {errorEdad && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorEdad}</span>
                </div>
              )}
              {!errorEdad && edadCalculada !== null && categoriaActiva && (
                <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Edad válida ({edadCalculada} años) para <strong>{categoriaActiva.nombre_categoria || categoriaActiva.nombre}</strong>.</span>
                </div>
              )}

              {/* Fila 4: Teléfono y Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Teléfono <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input 
                    type="text" 
                    maxLength={10}
                    placeholder="Ej. 0987654321"
                    {...register('telefono', {
                      onChange: (e) => onlyDigits(e, 10)
                    })} 
                    disabled={isExistingPlayer}
                    className={`w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
                      isExistingPlayer 
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                        : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                    }`} 
                  />
                  {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Correo (Opcional)</label>
                  <input 
                    type="email" 
                    placeholder="ejemplo@correo.com"
                    {...register('correo')} 
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none" 
                  />
                  {errors.correo && <p className="mt-1 text-xs text-red-600">{errors.correo.message}</p>}
                </div>
              </div>

              {/* Separador y Mini Cards de Documentos */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Documentos Adjuntos Opcionales (Máx 4 MB)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* Foto de Perfil */}
                  <div className={`relative rounded-xl border p-2.5 flex flex-col justify-between transition-colors ${fotoFile ? 'border-primary-300 bg-primary-50/40' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide truncate">Foto de perfil</span>
                      {fotoFile && (
                        <button 
                          type="button" 
                          onClick={() => { setFotoFile(null); if (fotoInputRef.current) fotoInputRef.current.value = ''; }}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fotoInputRef} 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={(e) => handleFileChange(e, setFotoFile, 'La foto de perfil', ['image/jpeg', 'image/png', 'image/webp'])}
                      className="hidden" 
                      id="input-doc-foto"
                    />
                    <label 
                      htmlFor="input-doc-foto" 
                      className="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white border border-gray-200 hover:border-primary-400 text-xs font-medium text-gray-700 hover:text-primary-700 transition-all truncate shadow-2xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{fotoFile ? fotoFile.name : 'Subir foto'}</span>
                    </label>
                  </div>

                  {/* Cédula */}
                  <div className={`relative rounded-xl border p-2.5 flex flex-col justify-between transition-colors ${cedulaFile ? 'border-primary-300 bg-primary-50/40' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide truncate">Cédula</span>
                      {cedulaFile && (
                        <button 
                          type="button" 
                          onClick={() => { setCedulaFile(null); if (cedulaInputRef.current) cedulaInputRef.current.value = ''; }}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={cedulaInputRef} 
                      accept="image/jpeg, image/png, image/webp, application/pdf" 
                      onChange={(e) => handleFileChange(e, setCedulaFile, 'El documento de cédula', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])}
                      className="hidden" 
                      id="input-doc-cedula"
                    />
                    <label 
                      htmlFor="input-doc-cedula" 
                      className="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white border border-gray-200 hover:border-primary-400 text-xs font-medium text-gray-700 hover:text-primary-700 transition-all truncate shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{cedulaFile ? cedulaFile.name : 'Subir cédula'}</span>
                    </label>
                  </div>

                  {/* Acta de Bachiller */}
                  <div className={`relative rounded-xl border p-2.5 flex flex-col justify-between transition-colors ${actaFile ? 'border-primary-300 bg-primary-50/40' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide truncate">Acta Bach.</span>
                      {actaFile && (
                        <button 
                          type="button" 
                          onClick={() => { setActaFile(null); if (actaInputRef.current) actaInputRef.current.value = ''; }}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={actaInputRef} 
                      accept="image/jpeg, image/png, image/webp, application/pdf" 
                      onChange={(e) => handleFileChange(e, setActaFile, 'El acta de bachiller', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])}
                      className="hidden" 
                      id="input-doc-acta"
                    />
                    <label 
                      htmlFor="input-doc-acta" 
                      className="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white border border-gray-200 hover:border-primary-400 text-xs font-medium text-gray-700 hover:text-primary-700 transition-all truncate shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{actaFile ? actaFile.name : 'Subir acta'}</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Tarjeta Informativa de Edición */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Información</p>
                  <p className="text-blue-700 leading-relaxed">Si necesitas editar los datos de un jugador ya registrado, comunícate con el administrador del torneo.</p>
                </div>
              </div>
              
              {/* Botón de Envío */}
              <div className="pt-2">
                <AsyncButton 
                  onClickAction={handleSubmit(onSubmit)} 
                  disabled={!isValid || !!errorEdad || isCheckingCedula || !!dorsalDuplicado}
                  className={`w-full py-3 text-white rounded-xl font-bold shadow-sm transition-all text-sm ${
                    isValid && !errorEdad && !isCheckingCedula && !dorsalDuplicado
                      ? 'bg-primary-600 hover:bg-primary-700 cursor-pointer' 
                      : 'bg-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isExistingPlayer ? 'Vincular Jugador a Plantilla' : 'Guardar Jugador'}
                </AsyncButton>
              </div>
            </form>
          </div>
        )}

        {/* Columna Derecha (o ancho completo centrado): Tabla de la Plantilla */}
        <div className={showForm ? 'lg:col-span-7 xl:col-span-8 2xl:col-span-8 min-w-0' : 'max-w-4xl w-full mx-auto'}>
          {isError ? (
            <div className="text-red-500 text-center py-6 bg-red-50 rounded-2xl border border-red-100 font-medium text-sm">
              Error al cargar la plantilla del equipo.
            </div>
          ) : isLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : plantilla.length === 0 ? (
            <EmptyState
              title="Plantilla Vacía"
              description="Aún no tienes jugadores inscritos en tu roster oficial."
              icon={<UserPlus className="mx-auto h-12 w-12 text-gray-400" />}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <DataGridTable
                columns={columns}
                data={plantilla}
                ariaLabel="Tabla de jugadores de la plantilla"
                compact={showForm}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Banner de Envío de Inscripción (solo en modo wizard) ─────────── */}
      {isWizardMode && (
        <div className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-300 max-w-4xl w-full mx-auto ${
          isMinReached
            ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md shadow-emerald-100'
            : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isMinReached ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              {isMinReached ? (
                <>
                  <p className="font-bold text-emerald-900 text-sm">
                    ¡Nómina lista para competir — {totalJugadores}/{MAX_JUGADORES} jugadores registrados!
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Tu equipo cumple el reglamento. Pulsa <strong>Inscribir Equipo</strong> para enviar la solicitud al administrador.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-900 text-sm">
                    Faltan {faltantesMinimo} jugador{faltantesMinimo !== 1 ? 'es' : ''} para poder inscribir tu equipo
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Añade al menos <strong>{MIN_JUGADORES} jugadores</strong> para habilitar el botón de envío.
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!isMinReached || isSubmittingInscripcion}
            onClick={handlePreFinalizar}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all shrink-0 shadow-sm sm:w-auto w-full justify-center ${
              isMinReached && !isSubmittingInscripcion
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300 hover:shadow-md cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmittingInscripcion ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmittingInscripcion ? 'Enviando...' : 'Inscribir Equipo y Enviar a Revisión'}
          </button>
        </div>
      )}

      {/* Modal de confirmación de jugador existente / advertencia torneo */}
      <ConfirmarJugadorModal 
        isOpen={isModalOpen}
        jugador={detectedPlayer}
        yaEnTorneo={yaEnTorneo}
        equipoTorneo={equipoTorneo}
        onClose={handleModalCancelar}
        onConfirm={handleModalAceptar}
      />

      {/* Modal de edición rápida de camiseta */}
      <EditarCamisetaModal
        isOpen={isEditingDorsal}
        plantilla={selectedPlantillaForDorsal}
        isSaving={isSavingDorsal}
        onClose={() => {
          setIsEditingDorsal(false);
          setSelectedPlantillaForDorsal(null);
        }}
        onSave={handleSaveEditarCamiseta}
      />

      {/* Modal de confirmación para remover jugador */}
      <ConfirmarEliminarJugadorModal
        isOpen={!!deletingPlantilla}
        onClose={() => setDeletingPlantilla(null)}
        onConfirm={handleConfirmEliminarPlantilla}
        jugadorNombre={deletingPlantilla?.jugador?.nombre || 'este jugador'}
        dorsal={deletingPlantilla?.numero_camiseta}
        isDeleting={isDeletingPlantilla}
        willBreakMinimo={plantilla.length <= MIN_JUGADORES}
        minJugadores={MIN_JUGADORES}
      />
    </div>
  );
}
