type StatusType = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Activo' | 'Inactivo' | string;

interface StatusBadgeProps {
  status: StatusType;
  textOverride?: string;
  title?: string;
}

export function StatusBadge({ status, textOverride, title }: StatusBadgeProps) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let defaultTitle = title;

  switch (status.toLowerCase()) {
    case 'aprobado':
    case 'activo':
    case 'finalizado':
    case 'finalizado w.o.':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      break;
    case 'rechazado':
    case 'retirado':
    case 'inactivo':
    case 'suspendido':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      break;
    case 'borrador':
      bgColor = 'bg-amber-100';
      textColor = 'text-amber-800';
      break;
    case 'pendiente':
    case 'en curso':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      if (!defaultTitle && status.toLowerCase() === 'pendiente') {
          defaultTitle = 'La administración hará las revisiones y luego aprobará';
      }
      break;
    case 'programado':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      break;
  }

  return (
    <span title={defaultTitle} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${bgColor} ${textColor} cursor-default`}>
      {textOverride || status}
    </span>
  );
}
