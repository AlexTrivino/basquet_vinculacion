import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

import { registerWithSupabase } from '../api/auth.api';
import { AsyncButton } from '../../../components/AsyncButton';

const registerSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Debes confirmar la contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const navigate = useNavigate();

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await registerWithSupabase(data.email, data.password, data.nombre);
      
      // Validación contra falso éxito (Email Enumeration Protection de Supabase)
      const identities = res.identities || res.user?.identities;
      if (identities && identities.length === 0) {
        toast.error('Este correo ya se encuentra registrado en nuestro sistema.');
        return;
      }
      
      setShowSuccessModal(true);
    } catch (error: any) {
      const message =
        error.response?.data?.error_description ||
        error.response?.data?.msg ||
        'Error al crear la cuenta. Intenta de nuevo.';
      toast.error(message);
    }
  };

  return (
    <>
    <form className="flex w-full flex-col gap-4">
      <div>
        <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          id="nombre"
          type="text"
          {...register('nombre')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Juan Pérez"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="tu@correo.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
          Confirmar Contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <AsyncButton
        type="button"
        onClickAction={handleSubmit(onSubmit)}
        className="mt-2 w-full bg-primary-600 py-2.5 text-white hover:bg-primary-700"
      >
        Registrarse
      </AsyncButton>

      <div className="mt-4 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/auth/login" className="font-semibold text-primary-600 hover:text-primary-500">
          Inicia sesión aquí
        </Link>
      </div>
    </form>

    {showSuccessModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 mb-6">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Revisa tu correo!</h3>
          <p className="text-gray-600 mb-8 text-sm">
            Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, haz clic en él para activar tu cuenta.<br/><br/>
            <span className="font-semibold text-gray-800">Nota:</span> Si no encuentras el correo en tu bandeja principal, recuerda revisar tu carpeta de <span className="font-semibold">Spam o Correo no deseado</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Entendido, ir al Login
          </button>
        </div>
      </div>
    )}
    </>
  );
}
