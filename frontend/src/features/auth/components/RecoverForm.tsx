import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

import { resetPasswordWithSupabase } from '../api/auth.api';
import { AsyncButton } from '../../../components/AsyncButton';

const recoverSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
});

type RecoverFormValues = z.infer<typeof recoverSchema>;

export function RecoverForm() {
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverFormValues>({
    resolver: zodResolver(recoverSchema),
  });

  const onSubmit = async (data: RecoverFormValues) => {
    try {
      await resetPasswordWithSupabase(data.email);
      setIsSent(true);
      toast.success('Instrucciones enviadas a tu correo');
    } catch (error: any) {
      const message =
        error.response?.data?.error_description ||
        error.response?.data?.msg ||
        'Error al procesar la solicitud. Intenta de nuevo.';
      toast.error(message);
    }
  };

  if (isSent) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">¡Revisa tu bandeja de entrada!</h3>
        <p className="text-sm text-gray-600 mb-6">
          Hemos enviado un enlace de recuperación. Por favor revisa también tu carpeta de spam.
        </p>
        <Link to="/auth/login" className="font-semibold text-primary-600 hover:text-primary-500">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form className="flex w-full flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Correo electrónico registrado
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

      <AsyncButton
        type="button"
        onClickAction={handleSubmit(onSubmit)}
        className="mt-2 w-full bg-primary-600 py-2.5 text-white hover:bg-primary-700"
      >
        Enviar instrucciones
      </AsyncButton>

      <div className="mt-4 text-center text-sm text-gray-600">
        ¿Recordaste tu contraseña?{' '}
        <Link to="/auth/login" className="font-semibold text-primary-600 hover:text-primary-500">
          Vuelve a iniciar sesión
        </Link>
      </div>
    </form>
  );
}
