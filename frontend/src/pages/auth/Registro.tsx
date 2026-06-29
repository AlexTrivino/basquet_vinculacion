import { RegisterForm } from '../../features/auth/components/RegisterForm';

export default function Registro() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-900">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Únete como delegado para gestionar tu equipo
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </main>
  );
}
