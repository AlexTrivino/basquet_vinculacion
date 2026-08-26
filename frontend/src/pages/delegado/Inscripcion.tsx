import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, ArrowRight } from 'lucide-react';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { InscripcionWizard } from '../../features/equipos/components/InscripcionWizard';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

import { useBusinessRules } from '../../hooks/useBusinessRules';


export default function Inscripcion() {
  // Verificamos si ya existe un borrador para este delegado
  const { data: response, isLoading } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
  });

  const inscripciones = response?.data || [];
  const borradorExistente = inscripciones.find(
    i => i.estado_inscripcion === 'borrador' || i.estado === 'borrador'
  );

  const { rules } = useBusinessRules();
  const maxEquiposDelegado = rules.MAX_EQUIPOS_POR_DELEGADO;

  const yaAlcanzoLimite = inscripciones.length >= maxEquiposDelegado && !borradorExistente;

  return (
    <main className="mx-auto w-full max-w-[1700px] px-2 sm:px-4 lg:px-6 py-6 transition-all duration-300">
      <div className="mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Registro de Equipo</h1>
        <p className="mt-1.5 text-sm text-gray-600 font-medium">
          Proporciona la información requerida para avalar a tu equipo en el torneo actual.<br/>
          Solo se permite registrar {maxEquiposDelegado} equipo(s) por delegado.
        </p>
      </div>

      {isLoading ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : yaAlcanzoLimite ? (
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<Users className="mx-auto h-12 w-12 text-primary-500" />}
            title="Límite de Equipos Alcanzado"
            description={`Has alcanzado el límite de ${maxEquiposDelegado} equipo(s) permitido por delegado. Administra tu equipo actual o consulta el estado de tus inscripciones desde el panel principal.`}
            action={
              <Link
                to="/delegado/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 shadow-sm transition-colors"
              >
                <span>Ir al Panel de Equipos</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <InscripcionWizard borradorExistente={borradorExistente} />
      )}
    </main>
  );
}
