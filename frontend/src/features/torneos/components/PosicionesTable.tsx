import { DataGridTable, type Column } from '../../../components/DataGridTable';

interface PosicionMock {
  id: string;
  equipo: string;
  pj: number;
  pg: number;
  pp: number;
  puntos: number;
}

const mockData: PosicionMock[] = [
  { id: '1', equipo: 'Los Lakers', pj: 10, pg: 8, pp: 2, puntos: 18 },
  { id: '2', equipo: 'Chicago Bulls', pj: 10, pg: 7, pp: 3, puntos: 17 },
  { id: '3', equipo: 'Miami Heat', pj: 10, pg: 5, pp: 5, puntos: 15 },
  { id: '4', equipo: 'Golden State', pj: 10, pg: 4, pp: 6, puntos: 14 },
];

const columns: Column<PosicionMock>[] = [
  { 
    key: 'equipo', 
    header: 'Equipo', 
    render: (row) => <span className="font-semibold text-primary-900">{row.equipo}</span> 
  },
  { key: 'pj', header: 'PJ' },
  { key: 'pg', header: 'PG' },
  { key: 'pp', header: 'PP' },
  { 
    key: 'puntos', 
    header: 'Pts', 
    render: (row) => <span className="font-bold text-gray-900">{row.puntos}</span> 
  },
];

export function PosicionesTable() {
  return (
    <div className="mt-6">
      <DataGridTable
        columns={columns}
        data={mockData}
        ariaLabel="Tabla de Posiciones FIBA"
      />
    </div>
  );
}
