import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { updatePasswordWithSupabase } from '../../features/auth/api/auth.api';
import { AsyncButton } from '../../components/AsyncButton';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const errCode = params.get('error_code');
    
    if (errCode) {
      setErrorCode(errCode);
    } else if (accessToken) {
      setToken(accessToken);
    } else {
      toast.error('Enlace inválido o expirado.');
    }
  }, []);

  const handleSubmit = async () => {
    if (!password) {
      toast.error('Ingresa una nueva contraseña');
      return;
    }
    if (!token) {
      toast.error('No se puede actualizar, enlace inválido');
      return;
    }
    
    try {
      await updatePasswordWithSupabase(password, token);
      toast.success('Contraseña actualizada correctamente. Inicia sesión.');
      navigate('/auth/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error_description || 'Error al actualizar contraseña');
    }
  };

  if (errorCode === 'otp_expired') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5 text-center">
          <h2 className="text-2xl font-bold text-red-300">Enlace expirado</h2>
          <p className="mt-2 text-sm text-slate-300">
            El enlace es inválido o ha expirado. Por tu seguridad, los enlaces de recuperación son de un solo uso.
          </p>
          <button 
            onClick={() => navigate('/auth/recuperar')} 
            className="mt-6 w-full flex justify-center rounded-md bg-celeste px-3 py-3 text-sm font-semibold leading-6 text-marino shadow-sm hover:bg-white"
          >
            Solicitar otro enlace
          </button>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5 text-center">
          <h2 className="text-2xl font-bold text-red-300">Enlace inválido</h2>
          <p className="mt-2 text-sm text-slate-300">Por favor solicita un nuevo restablecimiento de contraseña.</p>
          <button onClick={() => navigate('/auth/recuperar')} className="mt-4 text-celeste hover:underline">Volver a intentar</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-crema">
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Ingresa tu nueva contraseña para acceder.
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-crema">
              Nueva contraseña
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-crema shadow-sm ring-1 ring-inset ring-white/15 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-celeste sm:text-sm sm:leading-6"
                placeholder="********"
              />
            </div>
          </div>

          <AsyncButton onClickAction={handleSubmit} className="w-full flex justify-center rounded-md bg-celeste px-3 py-1.5 text-sm font-semibold leading-6 text-marino shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-celeste">
            Actualizar Contraseña
          </AsyncButton>
        </form>
      </div>
    </main>
  );
}
