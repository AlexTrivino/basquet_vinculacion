import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSanciones, updateSancion } from '../../features/sanciones/api/sanciones.api';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { AlertTriangle } from 'lucide-react';
import type { Sancion } from '../../types/api.types';

export default function AdminSanciones() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sanciones'],
    queryFn: () => getSanciones(),
  });

  const revocarMutation = useMutation({
    mutationFn: (id: number) => updateSancion(id, { estado: 'inactiva' }),
    onSuccess: () => {
      toast.success('Amonestación revocada.');
      queryClient.invalidateQueries({ queryKey: ['admin-sanciones'] });
    },
    onError: () => toast.error('Error al revocar la amonestación.')
  });

  const columns: Column<Sancion>[] = [
    { key: 'fecha', header: 'Fecha', render: (row) => <span className="text-sm">{row.fecha}</span> },
    { key: 'jugador', header: 'Infractor', render: (row) => <span className="font-medium text-crema">{row.jugador?.nombre}</span> },
    { key: 'partido', header: 'Partido Origen', render: (row) => <span className="text-sm text-slate-400">ID: {row.id_partido} - {row.partido?.fecha_programada}</span> },
    { key: 'motivo', header: 'Motivo', render: (row) => <span className="text-sm text-slate-300">{row.motivo}</span> },
    { key: 'estado', header: 'Estado', render: (row) => (
        row.estado === 'activa' 
          ? <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-200"><AlertTriangle className="w-3 h-3"/> Activa</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">Revocada</span>
      )
    },
    { key: 'acciones', header: 'Acciones', render: (row) => (
        <button
          onClick={() => { if(window.confirm('¿Revocar esta amonestación?')) revocarMutation.mutate(row.id_sancion); }}
          disabled={row.estado === 'inactiva' || revocarMutation.isPending}
          className={`px-3 py-1 rounded text-white text-sm font-medium ${row.estado === 'inactiva' ? 'bg-white/20 cursor-not-allowed' : 'bg-marino hover:bg-black'}`}
        >
          Revocar
        </button>
      )
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-crema flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-oro"/> Registro de Amonestaciones</h1>
        <p className="mt-1 text-sm text-slate-400">Panel de lectura y revocación de tarjetas amarillas.</p>
      </div>
      <div className="bg-marino-claro shadow-sm border border-white/10 rounded-lg overflow-hidden">
        <DataGridTable columns={columns} data={data?.data || []} isLoading={isLoading} emptyMessage="No existen amonestaciones registradas." />
      </div>
    </div>
  );
}
