import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Mail, Shield, Lock } from 'lucide-react';
import { getPerfil, actualizarPerfil } from '../../features/auth/api/usuarios.api';
import { updatePasswordWithSupabase } from '../../features/auth/api/auth.api';
import { AsyncButton } from '../../components/AsyncButton';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authStorage';

interface PerfilFormValues {
  nombre: string;
  correo: string;
  rol: string;
}

export default function MiPerfil() {
  const [newPassword, setNewPassword] = useState('');
  const { setUserName } = useAuth();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['mi_perfil'],
    queryFn: getPerfil,
  });

  const perfil = response?.data;

  const { register, handleSubmit, setValue, formState: { errors, isDirty, isSubmitting } } = useForm<PerfilFormValues>();

  useEffect(() => {
    if (perfil) {
      setValue('nombre', perfil.nombre);
      setValue('correo', perfil.correo);
      setValue('rol', perfil.rol);
    }
  }, [perfil, setValue]);

  const onSubmit = async (data: PerfilFormValues) => {
    try {
      await actualizarPerfil(data.nombre);
      setUserName(data.nombre);
      queryClient.invalidateQueries({ queryKey: ['mi_perfil'] });
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar el perfil');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      toast.error('No se encontró el token de sesión');
      return;
    }
    try {
      await updatePasswordWithSupabase(newPassword, token);
      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error_description || 'Error al actualizar la contraseña');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="max-w-2xl space-y-10">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Perfil Público</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Esta información se mostrará públicamente, así que ten cuidado con lo que compartes.
              </p>

              <form className="mt-6 space-y-8 border-t border-gray-100 pt-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                  
                  <div className="sm:col-span-4">
                    <label htmlFor="correo" className="block text-sm font-medium leading-6 text-gray-900">
                      Correo Electrónico
                    </label>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="correo"
                        type="email"
                        disabled
                        {...register('correo')}
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">El correo electrónico no puede ser modificado.</p>
                  </div>

                  <div className="sm:col-span-4">
                    <label htmlFor="rol" className="block text-sm font-medium leading-6 text-gray-900">
                      Rol de Usuario
                    </label>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="rol"
                        type="text"
                        disabled
                        {...register('rol')}
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label htmlFor="nombre" className="block text-sm font-medium leading-6 text-gray-900">
                      Nombre Completo
                    </label>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="nombre"
                        type="text"
                        {...register('nombre', { required: 'El nombre es obligatorio' })}
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                    {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
                  </div>

                </div>

                <div className="flex items-center justify-end gap-x-6 border-t border-gray-100 pt-6">
                  <AsyncButton 
                    disabled={!isDirty || isSubmitting}
                    onClickAction={handleSubmit(onSubmit)} 
                    className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Guardar Cambios
                  </AsyncButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="max-w-2xl space-y-10">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">Seguridad</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Actualiza tu contraseña para mantener tu cuenta segura.
              </p>

              <div className="mt-6 space-y-8 border-t border-gray-100 pt-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <label htmlFor="new-password" className="block text-sm font-medium leading-6 text-gray-900">
                      Nueva Contraseña
                    </label>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-x-6 border-t border-gray-100 pt-6">
                  <AsyncButton 
                    onClickAction={handleUpdatePassword} 
                    className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    Actualizar Contraseña
                  </AsyncButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
