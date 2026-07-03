type StatusType = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Activo' | 'Inactivo' | string;

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  switch (status.toLowerCase()) {
    case 'aprobado':
    case 'activo':
    case 'finalizado':
    case 'finalizado w.o.':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      break;
    case 'rechazado':
    case 'inactivo':
    case 'suspendido':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      break;
    case 'pendiente':
    case 'en curso':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      break;
    case 'programado':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      break;
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bgColor} ${textColor}`}>
      {status}
    </span>
  );
}
