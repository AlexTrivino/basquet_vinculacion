import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncButton } from '../../../components/AsyncButton';
import { getInscripciones, updateInscripcionEstado, purgarInscripcionesExpiradas, retirarEquipo } from '../api/equipos.api';
import { getTorneos } from '../../torneos/api/torneos.api';
import type { Inscripcion, Torneo } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import {
  FileWarning,
  Eye,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck,
  Shield,
  Check,
  Ban,
} from 'lucide-react';
import { ModalExpedienteInscripcion } from './ModalExpedienteInscripcion';
import { ModalRechazarInscripcion } from './ModalRechazarInscripcion';
import { ModalRetirarEquipo } from './ModalRetirarEquipo';
import { Escudo } from '../../torneos/components/PartidosList';

export function AuditoriaEquipos() {
  const queryClient = useQueryClient();
  const [selectedInscripcion, setSelectedInscripcion] = useState<Inscripcion | null>(null);
  const [rechazarTarget, setRechazarTarget] = useState<{ id: number; nombre: string } | null>(null);
  const [retirarTarget, setRetirarTarget] = useState<{ id: number; nombre: string } | null>(null);
  const [filterEstado, setFilterEstado] = useState<'todos' | 'pendiente' | 'aprobado' | 'retirado'>('pendiente');
  const [selectedTorneoId, setSelectedTorneoId] = useState<number | 'todos'>('todos');

  // Consulta de Inscripciones
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['inscripciones', 'admin'],
    queryFn: () => getInscripciones(1, 100),
  });

  // Consulta de Torneos para el selector de filtro
  const { data: torneosResponse } = useQuery({
    queryKey: ['torneos', 'admin_list'],
    queryFn: () => getTorneos(1, 100),
  });

  const torneos: Torneo[] = torneosResponse?.data || [];

  const todasLasInscripciones = (response?.data || []).filter(
    (i) => (i.estado_inscripcion || i.estado) !== 'borrador'
  );

  const conteoPendientes = todasLasInscripciones.filter(
    (i) => (i.estado_inscripcion || i.estado) === 'pendiente'
  ).length;

  const conteoAprobados = todasLasInscripciones.filter(
    (i) => (i.estado_inscripcion || i.estado) === 'aprobado'
  ).length;

  // Filtrar según pestañas y torneo seleccionado
  const inscripcionesFiltradas = todasLasInscripciones.filter((i) => {
    const estado = i.estado_inscripcion || i.estado;
    const matchEstado = filterEstado === 'todos' || estado === filterEstado;

    const idTorneoItem = i.torneo?.id_torneo || i.torneo?.id || i.id_torneo;
    const matchTorneo = selectedTorneoId === 'todos' || idTorneoItem === selectedTorneoId;

    return matchEstado && matchTorneo;
  });

  // Mutación para Aprobar / Rechazar
  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'aprobado' | 'rechazado' }) =>
      updateInscripcionEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
    },
  });

  const retirarMutation = useMutation({
    mutationFn: (id: number) => retirarEquipo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      setRetirarTarget(null);
      toast.success('El equipo ha sido retirado del torneo exitosamente.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al retirar el equipo');
    },
  });

  // Mutación para Purga de Expiradas (>30 días)
  const purgaMutation = useMutation({
    mutationFn: (dias: number) => purgarInscripcionesExpiradas(dias),
    onSuccess: (res) => {
      const data = res.data;
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success(
        `Purga completada: ${data?.inscripciones_purgadas ?? 0} inscripción(es) y ${data?.equipos_eliminados ?? 0} equipo(s) expirados eliminados.`
      );
    },
    onError: () => {
      toast.error('Ocurrió un error al purgar las inscripciones expiradas.');
    },
  });

  const handleAprobar = async (id: number, equipo: string) => {
    try {
      await updateEstadoMutation.mutateAsync({ id, estado: 'aprobado' });
      toast.success(`Equipo ${equipo} aprobado exitosamente.`);
    } catch (error) {
      toast.error(`Error al aprobar equipo ${equipo}.`);
    }
  };

  const handleConfirmRechazar = async () => {
    if (!rechazarTarget) return;
    const { id, nombre } = rechazarTarget;
    try {
      await updateEstadoMutation.mutateAsync({ id, estado: 'rechazado' });
      toast.success(`Inscripción del equipo ${nombre} rechazada y eliminada permanentemente.`);
      setRechazarTarget(null);
    } catch (error) {
      toast.error('Ocurrió un error al cambiar el estado.');
    }
  };

  const handleConfirmRetirar = async () => {
    if (retirarTarget) {
      await retirarMutation.mutateAsync(retirarTarget.id);
    }
  };

  const handleEjecutarPurga = async () => {
    const confirm = window.confirm(
      '¿Deseas eliminar automáticamente todos los borradores y solicitudes rechazadas con más de 30 días de inactividad? Esto liberará espacio en almacenamiento y base de datos.'
    );
    if (!confirm) return;
    await purgaMutation.mutateAsync(30);
  };

  const columns: Column<Inscripcion>[] = [
    {
      key: 'equipo',
      header: 'Equipo',
      render: (row) => {
        const nombre = row.equipo?.nombre_equipo || row.equipo?.nombre || 'Equipo';
        const logo = row.equipo?.url_logo;
        return (
          <div className="flex items-center gap-3.5 py-1">
            <Escudo url={logo} className="h-11 w-11" />
            <div>
              <span className="font-bold text-crema block text-base leading-snug">{nombre}</span>
              <span className="text-xs text-slate-400 font-medium">
                {row.torneo?.nombre || row.torneo?.nombre_torneo || 'Torneo'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (row) => {
        const cat = row.categoria?.nombre_categoria || row.categoria?.nombre || 'General';
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-crema border border-white/10">
            {cat}
          </span>
        );
      },
    },
    {
      key: 'delegado',
      header: 'Delegado / Contacto',
      render: (row) => {
        const u = row.equipo?.usuario;
        return (
          <div className="flex flex-col py-1">
            <span className="text-sm font-semibold text-crema">{u?.nombre || 'No especificado'}</span>
            <span className="text-xs text-slate-400 font-medium truncate max-w-[220px]">{u?.correo || 'Sin correo'}</span>
          </div>
        );
      },
    },
    {
      key: 'comprobante',
      header: 'Comprobante',
      render: (row) => {
        if (row.url_comprobante_pago) {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-400/30">
              <FileCheck className="w-4 h-4 text-emerald-300" />
              Adjunto
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 italic">
            Sin archivo
          </span>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        const estado = row.estado_inscripcion || row.estado;
        return <StatusBadge status={estado === 'pendiente' ? 'Pendiente' : estado === 'aprobado' ? 'Aprobado' : estado === 'retirado' ? 'Rechazado' : 'Rechazado'} textOverride={estado === 'retirado' ? 'Retirado' : undefined} />;
      },
    },
    {
      key: 'acciones',
      header: 'Acciones de Auditoría',
      render: (row) => {
        const id = row.id_inscripcion || row.id || 0;
        const nombreEquipo = row.equipo?.nombre_equipo || row.equipo?.nombre || 'Desconocido';
        const estado = row.estado_inscripcion || row.estado;

        return (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedInscripcion(row)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-celeste bg-celeste/10 border border-celeste/30 rounded-xl hover:bg-celeste/15 active:bg-celeste/25 transition-all shadow-xs"
              title="Abrir expediente completo"
            >
              <Eye className="w-4 h-4 text-celeste" />
              Auditar
            </button>

            {estado === 'pendiente' && (
              <>
                <AsyncButton
                  onClickAction={() => handleAprobar(id, nombreEquipo)}
                  className="inline-flex items-center gap-1.5 bg-emerald-500/20 px-3.5 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 active:bg-emerald-500/20 rounded-xl shadow-xs transition-colors"
                  title="Aprobar rápidamente"
                >
                  <Check className="w-4 h-4" />
                  Aprobar
                </AsyncButton>
                <button
                  type="button"
                  onClick={() => setRechazarTarget({ id, nombre: nombreEquipo })}
                  className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:bg-red-500/25 border border-red-400/30 px-3 py-2 text-sm font-semibold rounded-xl transition-colors shadow-xs"
                  title="Rechazar solicitud"
                >
                  <Ban className="w-4 h-4" />
                  Rechazar
                </button>
              </>
            )}

            {estado === 'aprobado' && (row.torneo?.estado === 'en_curso' || row.torneo?.estado === 'programado') && (
              <button
                type="button"
                onClick={() => setRetirarTarget({ id, nombre: nombreEquipo })}
                className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:bg-red-500/25 border border-red-400/30 px-3 py-2 text-sm font-semibold rounded-xl transition-colors shadow-xs"
                title="Retirar equipo del torneo en curso"
              >
                <Ban className="w-4 h-4" />
                Retirar
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-marino-claro p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm">
        <div className="flex items-center gap-1.5 p-1.5 bg-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterEstado('pendiente')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              filterEstado === 'pendiente'
                ? 'bg-marino-claro text-celeste shadow-sm'
                : 'text-slate-300 hover:text-crema'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendientes
            {conteoPendientes > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-black">
                {conteoPendientes}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterEstado('aprobado')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              filterEstado === 'aprobado'
                ? 'bg-marino-claro text-crema shadow-sm border border-white/10'
                : 'text-slate-300 hover:text-crema hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            Aprobados
            <span className="ml-1 text-xs text-slate-400">({conteoAprobados})</span>
          </button>
          <button
            onClick={() => setFilterEstado('retirado')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              filterEstado === 'retirado'
                ? 'bg-marino-claro text-crema shadow-sm border border-white/10'
                : 'text-slate-300 hover:text-crema hover:bg-white/10'
            }`}
          >
            <Ban className="w-4 h-4 text-red-300" />
            Retirados
          </button>
          <button
            onClick={() => setFilterEstado('todos')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              filterEstado === 'todos'
                ? 'bg-marino-claro text-celeste shadow-sm'
                : 'text-slate-300 hover:text-crema'
            }`}
          >
            <Layers className="w-4 h-4" />
            Todas
            <span className="ml-1 text-xs text-slate-400">({todasLasInscripciones.length})</span>
          </button>
        </div>

        {/* Filtro por Torneo & Botón de Purga */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTorneoId}
              onChange={(e) => setSelectedTorneoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="text-sm font-medium bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-slate-300 focus:ring-2 focus:ring-celeste focus:outline-none"
            >
              <option value="todos">Todos los torneos</option>
              {torneos.map((t) => (
                <option key={t.id || t.id_torneo} value={t.id || t.id_torneo}>
                  {t.nombre || t.nombre_torneo}
                </option>
              ))}
            </select>
          </div>

          <AsyncButton
            onClickAction={handleEjecutarPurga}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl transition-colors shadow-xs"
            title="Eliminar borradores y rechazados con más de 30 días de inactividad"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            Eliminar expiradas (&gt;30d)
          </AsyncButton>
        </div>
      </div>

      {/* Tabla de Inscripciones */}
      <div className="rounded-2xl border border-white/10 bg-marino-claro p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-oro/10 text-oro flex items-center justify-center border border-oro/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-crema">
                {filterEstado === 'pendiente'
                  ? 'Solicitudes Pendientes de Revisión'
                  : filterEstado === 'aprobado'
                  ? 'Inscripciones Aprobadas'
                  : 'Historial de Inscripciones'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Revisa los expedientes, nóminas y comprobantes de cada equipo participante
              </p>
            </div>
          </div>
          <span className="text-xs sm:text-sm text-slate-400 font-semibold px-3 py-1 bg-white/5 rounded-full border border-white/10">
            Mostrando {inscripcionesFiltradas.length} solicitud(es)
          </span>
        </div>

        {isError ? (
          <div className="text-red-400 text-center py-12 text-sm font-medium">
            Error al cargar las inscripciones desde el servidor.
          </div>
        ) : !isLoading && inscripcionesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin solicitudes en esta vista"
            description="No se encontraron inscripciones que coincidan con los filtros seleccionados."
            icon={<FileWarning className="mx-auto h-14 w-14 text-slate-400" />}
          />
        ) : (
          <DataGridTable
            columns={columns}
            data={inscripcionesFiltradas}
            isLoading={isLoading}
            ariaLabel="Auditoría de Equipos"
          />
        )}
      </div>

      {/* Modal de Expediente Completo (Dual) */}
      <ModalExpedienteInscripcion
        isOpen={!!selectedInscripcion}
        onClose={() => setSelectedInscripcion(null)}
        inscripcion={selectedInscripcion}
        onAprobar={handleAprobar}
        onRechazar={async (id) => {
          const row = todasLasInscripciones.find((i) => (i.id_inscripcion || i.id) === id);
          if (row) {
            setRechazarTarget({
              id,
              nombre: row.equipo?.nombre_equipo || row.equipo?.nombre || 'Equipo',
            });
          }
        }}
        isUpdating={updateEstadoMutation.isPending}
      />

      {/* Modal de Confirmación de Rechazo Directo */}
      <ModalRechazarInscripcion
        isOpen={!!rechazarTarget}
        onClose={() => setRechazarTarget(null)}
        onConfirm={handleConfirmRechazar}
        nombreEquipo={rechazarTarget?.nombre || ''}
        isLoading={updateEstadoMutation.isPending}
      />

      {/* Modal de Confirmación de Retiro */}
      <ModalRetirarEquipo
        isOpen={!!retirarTarget}
        onClose={() => setRetirarTarget(null)}
        onConfirm={handleConfirmRetirar}
        nombreEquipo={retirarTarget?.nombre || ''}
        isLoading={retirarMutation.isPending}
      />
    </div>
  );
}
