import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquiposAdmin, reactivarEquipo } from '../../features/equipos/api/equipos.api';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { StatusBadge } from '../../components/StatusBadge';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { DesactivarEquipoModal } from '../../features/equipos/components/DesactivarEquipoModal';

export default function AdminEquipos() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [equipoToDeactivate, setEquipoToDeactivate] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reseteo de paginación
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-equipos', page, debouncedSearch],
    queryFn: () => getEquiposAdmin(page, perPage, undefined, undefined, debouncedSearch),
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarEquipo,
    onSuccess: () => {
      toast.success('Equipo reactivado exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reactivar el equipo');
    },
  });

  const columns: Column<any>[] = [
    { key: 'id_equipo', header: 'ID' },
    { key: 'nombre_equipo', header: 'Nombre de Equipo' },
    {
      key: 'torneo',
      header: 'Torneo',
      render: (row) => {
        const torneos = row.inscripciones?.map((i: any) => i.torneo?.nombre).filter(Boolean);
        if (!torneos || torneos.length === 0) return <span className="text-gray-400 text-sm">Sin torneo</span>;
        return Array.from(new Set(torneos)).join(', ');
      }
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (row) => {
        const categorias = row.inscripciones?.map((i: any) => i.categoria?.nombre_categoria).filter(Boolean);
        if (!categorias || categorias.length === 0) return <span className="text-gray-400 text-sm">Sin categoría</span>;
        return Array.from(new Set(categorias)).join(', ');
      }
    },
    {
      key: 'delegado',
      header: 'Delegado',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.usuario?.nombre || 'Desconocido'}</span>
          <span className="text-xs text-gray-500">{row.usuario?.correo || 'Sin correo'}</span>
        </div>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <StatusBadge status={row.estado === 'activo' ? 'Aprobado' : 'Rechazado'} />
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEquipoToDeactivate(row.id_equipo)}
            disabled={row.estado === 'inactivo'}
            className={`px-3 py-1 rounded text-white text-sm font-medium ${
              row.estado === 'inactivo' ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            Desactivar
          </button>
          <button
            onClick={() => reactivarMutation.mutate(row.id_equipo)}
            disabled={row.estado === 'activo' || reactivarMutation.isPending}
            className={`px-3 py-1 rounded text-white text-sm font-medium ${
              row.estado === 'activo' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Reactivar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-fit min-w-[60%] px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
          <p className="mt-1 text-sm text-gray-500">Panel administrativo para control del estado de los equipos.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre de equipo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <DataGridTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No se encontraron equipos registrados."
        />
        
        {/* Paginación simple si se necesita visualizar */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:justify-end gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <DesactivarEquipoModal
        isOpen={equipoToDeactivate !== null}
        onClose={() => setEquipoToDeactivate(null)}
        idEquipo={equipoToDeactivate || 0}
        isAdmin={true}
      />
    </div>
  );
}
