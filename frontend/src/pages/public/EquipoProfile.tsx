import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Calendar, Trophy, Users, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/AuthContext';
import { getEquipoById, uploadLogoEquipo, uploadBannerEquipo, deleteLogoEquipo, deleteBannerEquipo, getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import { getPartidosByEquipo } from '../../features/partidos/api/partidos.api';
import { getPlantillas } from '../../features/plantillas/api/plantillas.api';
import axiosInstance from '../../api/axios.config';

import { Skeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { DesactivarEquipoModal } from '../../features/equipos/components/DesactivarEquipoModal';

// 🚩 FEATURE FLAG: Subida de imágenes de equipo por delegados.
// Activado para habilitar los overlays de foto de banner y logo en hover.
const TEAM_UPLOADS_ENABLED = true;

export default function EquipoProfile({ teamId }: { teamId?: number }) {
  const { id } = useParams<{ id: string }>();
  const idEquipo = teamId || Number(id);
  const { isAuthenticated, userRole } = useAuth();
  const queryClient = useQueryClient();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Queries
  const { data: equipoRes, isLoading: loadingEquipo } = useQuery({
    queryKey: ['equipo', idEquipo],
    queryFn: () => getEquipoById(idEquipo),
    enabled: !!idEquipo,
  });
  const equipo = equipoRes?.data;

  const { data: plantillasRes, isLoading: loadingPlantilla } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo, 1, 100),
    enabled: !!idEquipo,
  });
  const plantillas = plantillasRes?.data || [];

  const { data: partidosRes, isLoading: loadingPartidos } = useQuery({
    queryKey: ['partidos', idEquipo],
    queryFn: () => getPartidosByEquipo(idEquipo),
    enabled: !!idEquipo,
  });
  const partidos = partidosRes?.data || [];

  const { data: inscRes } = useQuery({
    queryKey: ['inscripciones-publicas', idEquipo],
    queryFn: () => getInscripcionesPublicas(undefined, idEquipo),
    enabled: !!idEquipo,
  });
  const inscripciones = inscRes?.data || [];

  const { data: userMe } = useQuery({
    queryKey: ['usuario-me'],
    queryFn: async () => {
      const res = await axiosInstance.get('/usuarios/me');
      return res.data?.data;
    },
    enabled: isAuthenticated,
  });

  // Check if owner
  const isOwner = userRole === 'super_admin' || (userRole === 'delegado' && equipo?.id_usuario === userMe?.id_usuario);

  // Mutations
  const uploadLogo = useMutation({
    mutationFn: (file: File) => uploadLogoEquipo(idEquipo, file),
    onSuccess: () => {
      toast.success('Logo actualizado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '';
      toast.error(message.toLowerCase().includes('tamaño') || message.toLowerCase().includes('size') ? 'El logo excede el tamaño máximo permitido (500 KB).' : 'Error al subir el logo');
    },
  });

  const deleteLogo = useMutation({
    mutationFn: () => deleteLogoEquipo(idEquipo),
    onSuccess: () => {
      toast.success('Logo eliminado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: () => toast.error('Error al eliminar el logo'),
  });

  const uploadBanner = useMutation({
    mutationFn: (file: File) => uploadBannerEquipo(idEquipo, file),
    onSuccess: () => {
      toast.success('Banner actualizado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '';
      toast.error(message.toLowerCase().includes('tamaño') || message.toLowerCase().includes('size') ? 'El banner excede el tamaño máximo permitido (1 MB).' : 'Error al subir el banner');
    },
  });

  const deleteBanner = useMutation({
    mutationFn: () => deleteBannerEquipo(idEquipo),
    onSuccess: () => {
      toast.success('Banner eliminado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: () => toast.error('Error al eliminar el banner'),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadBanner.mutate(file);
  };

  if (loadingEquipo) {
    return (
      <div className="w-full bg-gray-50 flex flex-col pb-12">
        <Skeleton className="w-full aspect-[21/9] sm:aspect-[21/6]" />
        <div className="max-w-7xl mx-auto px-4 w-full -mt-16 sm:-mt-24 z-10">
          <Skeleton className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl border-4 border-white" />
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Equipo no encontrado</h2>
          <Link to="/" className="text-primary-600 hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  // Derived data
  const finalizados = partidos.filter(p => p.estado === 'finalizado' || p.estado === 'finalizado_wo').sort((a, b) => new Date(`${b.fecha}T${b.hora}`).getTime() - new Date(`${a.fecha}T${a.hora}`).getTime());
  const programados = partidos.filter(p => p.estado === 'programado').sort((a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime());
  const ultimoPartido = finalizados[0];
  const categoriasTexto = inscripciones.length > 0 ? Array.from(new Set(inscripciones.map(i => i.categoria ? `${i.categoria.nombre_categoria} (${i.categoria.genero_categoria})` : null))).filter(Boolean).join(', ') : '';

  return (
    <div className="w-full bg-gray-50 pb-12">
      {/* Banner Section */}
      <div className="relative aspect-[21/9] sm:aspect-[21/6] w-full object-cover group">
        {equipo.url_foto_equipo ? (
          <img src={equipo.url_foto_equipo} alt={`Banner de ${equipo.nombre_equipo}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600" />
        )}
        
        {isOwner && TEAM_UPLOADS_ENABLED && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
            <span className="absolute bottom-4 text-white/90 text-xs font-semibold drop-shadow-md">Tamaño máximo: 1 MB</span>
            <input type="file" className="hidden" ref={bannerInputRef} accept="image/*" onChange={handleBannerChange} />
            <button onClick={() => bannerInputRef.current?.click()} className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 shadow-xl transition-transform hover:scale-110" title="Cambiar portada">
              <Camera className="w-6 h-6" />
            </button>
            {equipo.url_foto_equipo && (
              <button onClick={() => deleteBanner.mutate()} className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-xl transition-transform hover:scale-110" title="Eliminar portada">
                <Trash2 className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>

      {isOwner && equipo.estado === 'activo' && userRole === 'super_admin' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 flex justify-end">
          <button 
            onClick={() => setIsDeactivateModalOpen(true)}
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-red-200"
          >
            <ShieldAlert className="w-4 h-4" /> Desactivar Equipo
          </button>
        </div>
      )}
      <DesactivarEquipoModal 
        isOpen={isDeactivateModalOpen} 
        onClose={() => setIsDeactivateModalOpen(false)} 
        idEquipo={idEquipo} 
      />

      {equipo.estado === 'inactivo' && (
        <div className="fixed top-16 left-0 w-full z-40 bg-red-600 text-white text-center py-2 text-sm font-bold shadow-md tracking-wide">
          ⚠️ Este equipo se encuentra actualmente inactivo en la liga.
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-6 relative">
          
          {/* Logo */}
          <div className="relative -mt-16 sm:-mt-24 ml-4 sm:ml-8 flex-shrink-0 z-10">
            <div className="aspect-square w-32 h-32 sm:w-48 sm:h-48 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden relative group">
              {equipo.url_logo ? (
                <img src={equipo.url_logo} alt={`Logo de ${equipo.nombre_equipo}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-700 text-4xl sm:text-6xl font-bold">
                  {equipo.nombre_equipo?.substring(0, 2).toUpperCase()}
                </div>
              )}
              
              {isOwner && TEAM_UPLOADS_ENABLED && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <span className="absolute bottom-4 text-white/90 text-xs font-semibold drop-shadow-md text-center px-2 leading-tight">Máximo: 500 KB</span>
                  <div className="flex gap-3">
                    <input type="file" className="hidden" ref={logoInputRef} accept="image/*" onChange={handleLogoChange} />
                    <button onClick={() => logoInputRef.current?.click()} className="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100">
                      <Camera className="w-5 h-5" />
                    </button>
                    {equipo.url_logo && (
                      <button onClick={() => deleteLogo.mutate()} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600">
                        <span className="font-bold px-1">X</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Header */}
          <div className="pt-4 sm:pt-6 pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{equipo.nombre_equipo}</h1>
            {categoriasTexto && (
              <p className="text-sm font-medium text-gray-500 mt-1 capitalize">Categorías: {categoriasTexto}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> Torneos inscritos</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {plantillas.length} Jugadores</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          
          {/* Columna Izquierda: Partidos */}
          <div className="lg:col-span-2 space-y-8">
            {/* Último Partido */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Último Partido
              </h2>
              {loadingPartidos ? <Skeleton className="h-32 rounded-xl" /> : ultimoPartido ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                    <span>{ultimoPartido.fecha} • {ultimoPartido.hora}</span>
                    <StatusBadge status="Finalizado" />
                  </div>
                  <div className="flex justify-center items-center gap-6 sm:gap-12">
                    <div className="text-center flex-1">
                      <p className="font-bold text-gray-900 text-lg sm:text-xl truncate">{ultimoPartido.equipo_local?.nombre_equipo}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-3xl sm:text-4xl font-black bg-gray-100 px-4 py-2 rounded-lg text-gray-800 tracking-tighter">
                        {ultimoPartido.marcador_local} - {ultimoPartido.marcador_visitante}
                      </div>
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-bold text-gray-900 text-lg sm:text-xl truncate">{ultimoPartido.equipo_visitante?.nombre_equipo}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                  No hay partidos finalizados aún.
                </div>
              )}
            </div>

            {/* Próximos Partidos */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" /> Próximos Partidos
              </h2>
              {loadingPartidos ? <Skeleton className="h-48 rounded-xl" /> : programados.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                  {programados.slice(0, 3).map(p => (
                    <div key={p.id_partido} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{p.fecha}</span>
                        <span className="text-xs text-gray-500">{p.hora} • {p.ubicacion}</span>
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-gray-800">
                        <span>{p.equipo_local?.nombre_equipo}</span>
                        <span className="text-gray-400 text-xs">vs</span>
                        <span>{p.equipo_visitante?.nombre_equipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                  No hay próximos partidos programados.
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Plantilla */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Roster Oficial
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loadingPlantilla ? <Skeleton className="h-64" /> : plantillas.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {plantillas.map(jugador => (
                    <li key={jugador.id_plantilla} className="px-2 py-1">
                      <Link to={`/jugadores/${jugador.jugador?.id_jugador}`} className="group flex items-center gap-3 p-2 hover:bg-primary-50 rounded-lg transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 flex-shrink-0 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                          {jugador.numero_camiseta}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                            {jugador.jugador?.nombre}
                          </span>
                          <span className="text-xs text-gray-500">Jugador</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">
                  Aún no hay jugadores registrados en la plantilla.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
