type StatusType = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Activo' | 'Inactivo' | string;

interface StatusBadgeProps {
  status: StatusType;
  textOverride?: string;
  title?: string;
}

export function StatusBadge({ status, textOverride, title }: StatusBadgeProps) {
  let bgColor = 'bg-white/10';
  let textColor = 'text-crema';
  let defaultTitle = title;

  switch (status.toLowerCase()) {
    case 'aprobado':
    case 'activo':
    case 'finalizado':
    case 'finalizado w.o.':
      bgColor = 'bg-green-500/15';
      textColor = 'text-green-200';
      break;
    case 'rechazado':
    case 'retirado':
    case 'inactivo':
    case 'suspendido':
      bgColor = 'bg-red-500/15';
      textColor = 'text-red-200';
      break;
    case 'borrador':
      bgColor = 'bg-amber-500/15';
      textColor = 'text-amber-200';
      break;
    case 'pendiente':
    case 'en_curso':
      bgColor = 'bg-yellow-500/15';
      textColor = 'text-yellow-200';
      if (!defaultTitle && status.toLowerCase() === 'pendiente') {
          defaultTitle = 'La administración hará las revisiones y luego aprobará';
      }
      break;
    case 'programado':
      bgColor = 'bg-blue-500/15';
      textColor = 'text-blue-200';
      break;
  }

  const displayStatus = (textOverride || status).replace(/_/g, ' ');

  return (
    <span title={defaultTitle} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${bgColor} ${textColor} cursor-default`}>
      {displayStatus}
    </span>
  );
}
