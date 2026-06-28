import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '../../../components/EmptyState';
import { AsyncButton } from '../../../components/AsyncButton';

export function GestorPartidos() {
  const handleGenerar = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success('Calendario generado exitosamente (Simulación)');
  };

  return (
    <div className="flex flex-col gap-6">
      <EmptyState
        title="No hay partidos programados"
        description="El torneo aún no tiene un calendario oficial generado para esta fase."
        icon={<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />}
        action={
          <AsyncButton onClickAction={handleGenerar} className="bg-primary-600 px-6 text-white hover:bg-primary-700">
            Generar Calendario Automático
          </AsyncButton>
        }
      />
    </div>
  );
}
