import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { resetPasswordWithSupabase } from '../../features/auth/api/auth.api';
import { AsyncButton } from '../../components/AsyncButton';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Ingresa tu correo');
      return;
    }
    try {
      await resetPasswordWithSupabase(email);
      setSuccess(true);
      toast.success('Correo enviado');
    } catch (error: any) {
      toast.error(error.response?.data?.error_description || 'Error al enviar correo de recuperación');
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-crema">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Ingresa tu correo para recibir un enlace de recuperación
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-400/30 text-green-200 p-4 rounded-md text-center text-sm font-medium">
            Revisa tu bandeja de entrada o la carpeta de spam para restablecer tu contraseña.
          </div>
        ) : (
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-crema">
                Correo electrónico
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-10 text-crema shadow-sm ring-1 ring-inset ring-white/15 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-celeste sm:text-sm sm:leading-6"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <AsyncButton onClickAction={handleSubmit} className="w-full flex justify-center rounded-md bg-celeste px-3 py-1.5 text-sm font-semibold leading-6 text-marino shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-celeste">
              Enviar enlace de recuperación
            </AsyncButton>
          </form>
        )}

        <Link to="/auth/login" className="mt-4 flex w-full justify-center items-center gap-2 rounded-md border border-white/15 bg-marino-claro px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-white/5 focus:outline-none">
          <ArrowLeft className="w-4 h-4" />
          Volver a Iniciar Sesión
        </Link>
      </div>
    </main>
  );
}
