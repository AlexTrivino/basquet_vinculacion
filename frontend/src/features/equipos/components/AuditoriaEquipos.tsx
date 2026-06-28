import { toast } from 'sonner';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncButton } from '../../../components/AsyncButton';

interface EquipoAuditoria {
  id: string;
  nombre: string;
  categoria: string;
  entrenador: string;
  estado: string;
}

const mockEquipos: EquipoAuditoria[] = [
  { id: '1', nombre: 'Los Ángeles Lakers', categoria: 'Masculino Senior', entrenador: 'Phil Jackson', estado: 'Pendiente' },
  { id: '2', nombre: 'Chicago Bulls', categoria: 'Masculino Senior', entrenador: 'Phil Jackson', estado: 'Aprobado' },
  { id: '3', nombre: 'Miami Heat', categoria: 'Masculino Senior', entrenador: 'Erik Spoelstra', estado: 'Rechazado' },
];

export function AuditoriaEquipos() {
  const handleAprobar = async (equipo: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(`Equipo ${equipo} aprobado exitosamente.`);
  };

  const handleRechazar = async (equipo: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.error(`Equipo ${equipo} rechazado.`);
  };

  const columns: Column<EquipoAuditoria>[] = [
    { key: 'nombre', header: 'Equipo', render: (row) => <span className="font-semibold text-gray-900">{row.nombre}</span> },
    { key: 'categoria', header: 'Categoría' },
    { key: 'entrenador', header: 'Entrenador' },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <AsyncButton
            onClickAction={() => handleAprobar(row.nombre)}
            disabled={row.estado !== 'Pendiente'}
            className="bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            Aprobar
          </AsyncButton>
          <AsyncButton
            onClickAction={() => handleRechazar(row.nombre)}
            disabled={row.estado !== 'Pendiente'}
            className="bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:bg-gray-300"
          >
            Rechazar
          </AsyncButton>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Solicitudes Recientes</h2>
      <DataGridTable columns={columns} data={mockEquipos} ariaLabel="Auditoría de Equipos" />
    </div>
  );
}
