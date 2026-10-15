import { RegisterForm } from '../../features/auth/components/RegisterForm';

export default function Registro() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-marino-claro p-8 shadow-xl ring-1 ring-white/5">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-crema">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Únete como delegado para gestionar tu equipo
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </main>
  );
}
