import { RecoverForm } from '../../features/auth/components/RecoverForm';

export default function Recuperar() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-crema">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Te enviaremos un enlace para restablecer el acceso
          </p>
        </div>
        
        <RecoverForm />
      </div>
    </main>
  );
}
