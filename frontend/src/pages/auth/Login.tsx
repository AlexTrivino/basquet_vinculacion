import { useEffect } from 'react';
import { LoginForm } from '../../features/auth/components/LoginForm';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error_msg');
    
    if (errorMsg) {
      toast.error(errorMsg, { duration: 6000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">

      
      <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5">
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="Torneos Baloncesto Manta Logo" className="h-60 w-200 object-contain mb-4" />
          <h2 className="font-display text-3xl font-bold tracking-tight text-crema">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Accede al panel de Torneos Baloncesto Manta
          </p>
        </div>
        
        <LoginForm />
        <Link to="/" className="mt-4 flex w-full justify-center items-center gap-2 rounded-md border border-white/15 bg-marino-claro px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-white/5 focus:outline-none">
          <ArrowLeft className="w-4 h-4" />
          Volver al portal público
        </Link>
      </div>
    </main>
  );
}
