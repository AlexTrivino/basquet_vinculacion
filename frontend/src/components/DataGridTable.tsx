import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataGridTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
  compact?: boolean;
  className?: string;
}

export function DataGridTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles.',
  ariaLabel = 'Tabla de datos',
  compact = false,
  className = '',
}: DataGridTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full animate-pulse" aria-busy="true">
        <div className="mb-2 h-10 w-full rounded bg-gray-200"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-2 h-12 w-full rounded bg-gray-100"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="p-4 text-center text-sm text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <table
        className={`w-full text-left text-gray-600 ${
          compact ? 'text-xs' : 'whitespace-nowrap text-sm'
        }`}
        aria-label={ariaLabel}
      >
        <thead className="border-b border-gray-200 bg-gray-50 text-gray-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${
                  compact ? 'px-3.5 py-2.5 text-xs font-bold text-slate-700' : 'px-6 py-3 font-semibold'
                } ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-gray-50/80 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${
                    compact ? 'px-3.5 py-2.5 align-middle' : 'px-6 py-4'
                  } ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

