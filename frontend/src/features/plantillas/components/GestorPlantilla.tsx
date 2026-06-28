import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { AsyncButton } from '../../../components/AsyncButton';

interface JugadorMock {
  id: string;
  nombre: string;
  camiseta: number;
  posicion: string;
  cedula: string;
}

const mockJugadores: JugadorMock[] = [
  { id: '1', nombre: 'Michael Jordan', camiseta: 23, posicion: 'Escolta', cedula: '1234567890' },
  { id: '2', nombre: 'Scottie Pippen', camiseta: 33, posicion: 'Alero', cedula: '0987654321' },
  { id: '3', nombre: 'Dennis Rodman', camiseta: 91, posicion: 'Ala-pívot', cedula: '1122334455' },
];

const columns: Column<JugadorMock>[] = [
  { 
    key: 'nombre', 
    header: 'Nombre', 
    render: (row) => <span className="font-medium text-gray-900">{row.nombre}</span> 
  },
  { 
    key: 'camiseta', 
    header: 'Camiseta', 
    render: (row) => <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">#{row.camiseta}</span> 
  },
  { key: 'posicion', header: 'Posición' },
  { 
    key: 'cedula', 
    header: 'Cédula / ID', 
    render: (row) => <span className="text-gray-500">{row.cedula}</span> 
  },
];

export function GestorPlantilla() {
  const handleAddPlayer = async () => {
    // Simula red (1s) para que el spinner del AsyncButton se active visiblemente.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.info('El modal para registrar un nuevo jugador estará disponible pronto.');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Roster del Equipo</h2>
          <p className="text-sm text-gray-500">Administra a los jugadores aprobados en tu plantilla oficial.</p>
        </div>
        <AsyncButton
          onClickAction={handleAddPlayer}
          className="bg-primary-600 text-white shadow-sm hover:bg-primary-700 sm:w-auto w-full"
        >
          <UserPlus className="h-4 w-4" />
          Añadir Jugador
        </AsyncButton>
      </div>

      <DataGridTable
        columns={columns}
        data={mockJugadores}
        ariaLabel="Tabla de jugadores de la plantilla"
      />
    </div>
  );
}
