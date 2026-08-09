import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth, type UserRole } from '../../../context/AuthContext';
import { loginWithSupabase } from '../api/auth.api';
import { AsyncButton } from '../../../components/AsyncButton';
import api from '../../../api/axios.config';

// 1. Esquema de Validación con Zod
const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  // 2. Integración de React Hook Form (única fuente de la verdad para el form)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  // 3. Lógica de Submit y Autenticación
  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await loginWithSupabase(data.email, data.password);
      
      const token = response.access_token;
      
      // Consultamos el rol directamente de nuestra base de datos (public.usuarios)
      // porque si se edita el rol manualmente en la tabla, el token JWT de Supabase
      // no se entera automáticamente.
      const meResponse = await api.get('/usuarios/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const role = (meResponse.data?.data?.rol || 'delegado') as UserRole;
      const nombre = meResponse.data?.data?.nombre || '';

      login(token, role, nombre, data.rememberMe);
      toast.success('Inicio de sesión exitoso');
      
      if (role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/delegado/dashboard');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error_description ||
        error.response?.data?.msg ||
        'Credenciales inválidas o error de conexión';
      toast.error(message);
    }
  };

  return (
    <form className="flex w-full flex-col gap-4">
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

      {/* Opción Recordar mi sesión + Olvidaste contraseña alineados */}
      <div className="flex items-center justify-between">
        <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="rememberMe"
            type="checkbox"
            {...register('rememberMe')}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700">Recordar mi sesión</span>
        </label>

        <Link to="/auth/recuperar" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Uso obligatorio de AsyncButton como se solicitó, interceptando el Submit de RHF */}
      <AsyncButton
        type="button"
        onClickAction={() => handleSubmit(onSubmit)()}
        className="mt-2 w-full bg-primary-600 py-2.5 text-white hover:bg-primary-700"
      >
        Ingresar
      </AsyncButton>

      <div className="mt-2 flex flex-col items-center gap-2 text-sm text-gray-600">
        <div>
          ¿No tienes una cuenta?{' '}
          <Link to="/auth/registro" className="font-semibold text-primary-600 hover:text-primary-500">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </form>
  );
}
