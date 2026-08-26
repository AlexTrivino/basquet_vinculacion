import { useParams, Navigate } from 'react-router-dom';
import { ReinscripcionWizard } from '../../features/equipos/components/ReinscripcionWizard';

export default function Reinscripcion() {
  const { idEquipo } = useParams<{ idEquipo: string }>();

  if (!idEquipo) {
    return <Navigate to="/delegado/dashboard" />;
  }

  return (
    <main className="mx-auto w-full max-w-[1700px] px-2 sm:px-4 lg:px-6 py-12 transition-all duration-300">
      <ReinscripcionWizard 
        idEquipo={Number(idEquipo)} 
      />
    </main>
  );
}
