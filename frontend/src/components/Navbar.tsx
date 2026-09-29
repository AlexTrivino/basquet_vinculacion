import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusinessRules } from '../hooks/useBusinessRules';
import { Sidebar } from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { getInscripciones } from '../features/equipos/api/equipos.api';
import { getPerfil } from '../features/auth/api/usuarios.api';

const NAV_LINKS = {
  public: [
    { name: 'Inicio', path: '/' },
    { name: 'Equipos', path: '/equipos' },
  ],
  delegado: [
    { name: 'Mi Equipo', path: '/delegado/dashboard' },
    { name: 'Inscripción', path: '/delegado/inscripcion' },
    { name: 'Plantilla', path: '/delegado/plantilla' },
  ],
  public_delegado: [
    { name: 'Inicio', path: '/' },
    { name: 'Equipos', path: '/equipos' },
  ],
  super_admin: [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Torneos', path: '/admin/torneos' },
    { name: 'Equipos', path: '/admin/equipos' },
    { name: 'Jugadores', path: '/admin/jugadores' },
    { name: 'Partidos', path: '/admin/partidos' },
    { name: 'Inscripciones', path: '/admin/auditoria' },
    { name: 'Sanciones', path: '/admin/sanciones' },
    { name: 'Auspiciantes', path: '/admin/patrocinadores' },
  ],
  public_admin: [
    { name: 'Inicio', path: '/' },
    { name: 'Directorio', path: '/equipos' },
  ],
};

export function Navbar() {
  const { userRole, isAuthenticated, logout, activeTeamId, userName } = useAuth();
  const { rules } = useBusinessRules();
  const maxEquiposDelegado = rules.MAX_EQUIPOS_POR_DELEGADO || 1;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  // En la portada y el directorio de equipos el navbar toma los colores de la página (marino, crema y oro)
  const enInicio = ['/', '/equipos'].includes(useLocation().pathname);
  const claseEnlace = (isActive: boolean, inactivo: string) =>
    `text-sm font-medium ${
      enInicio
        ? isActive ? 'text-crema' : 'text-slate-300 hover:text-white'
        : isActive ? 'text-primary-600' : `${inactivo} hover:text-primary-600`
    }`;
  const separador = enInicio ? 'border-white/15' : 'border-gray-200';

  const { data: perfilRes } = useQuery({
    queryKey: ['mi_perfil'],
    queryFn: getPerfil,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const nombreUsuario = perfilRes?.data?.nombre || userName || (userRole === 'super_admin' ? 'Administrador' : 'Delegado');
  const userInitial = nombreUsuario ? nombreUsuario.trim().charAt(0).toUpperCase() : 'U';

  const { data: response } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
    enabled: userRole === 'delegado',
  });
  const inscripciones = response?.data || [];

  const activeInscripcion = (activeTeamId
    ? inscripciones.find(ins => (ins.equipo?.id_equipo || ins.equipo?.id) === activeTeamId)
    : null) || (inscripciones.length > 0 ? inscripciones[0] : null);

  const borradorExistente = inscripciones.some(i => i.estado_inscripcion === 'borrador' || i.estado === 'borrador');

  const isPlantillaDisabled = 
    userRole === 'delegado' && (!activeTeamId || (activeInscripcion && activeInscripcion.estado_inscripcion !== 'aprobado' && activeInscripcion.estado !== 'aprobado'));

  const isInscripcionDisabled = 
    userRole === 'delegado' &&
    inscripciones.length >= maxEquiposDelegado &&
    !borradorExistente;

  const renderTeamSwitcher = () => {
    return null; 
  };

  const links = userRole === 'super_admin' ? NAV_LINKS.super_admin :
                userRole === 'delegado' ? NAV_LINKS.delegado : NAV_LINKS.public;

  const userLinks = userRole === 'super_admin' ? NAV_LINKS.public_admin :
                    userRole === 'delegado' ? NAV_LINKS.public_delegado : [];

  const disabledPaths: string[] = [];
  if (isInscripcionDisabled) disabledPaths.push('/delegado/inscripcion');
  if (isPlantillaDisabled) disabledPaths.push('/delegado/plantilla');

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 w-full border-b ${enInicio ? 'border-white/10 bg-marino' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`inline-flex items-center justify-center rounded-md p-2 lg:hidden ${enInicio ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-3">
              {/* En la portada va el recorte del escudo: sobre marino el logo con márgenes se pierde */}
              <img
                src={enInicio ? '/img/logo-recortado.webp' : '/logo.png'}
                alt="Torneos Baloncesto Manta Logo"
                className="h-12 w-12 object-contain"
              />
              <span className={`text-xl font-bold hidden sm:block ${enInicio ? 'text-crema' : 'text-primary-600'}`}>Torneos Baloncesto Manta</span>
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 justify-center lg:items-center lg:gap-8">
            {links.map((link) => {
              if (link.path === '/delegado/inscripcion' && isInscripcionDisabled) {
                return (
                  <span
                    key={link.path}
                    className="text-sm font-medium text-gray-400 cursor-not-allowed py-2 select-none"
                    title={`Límite de ${maxEquiposDelegado} equipo(s) alcanzado`}
                  >
                    {link.name}
                  </span>
                );
              }

              if (link.path === '/delegado/plantilla' && isPlantillaDisabled) {
                const tooltip = !activeInscripcion 
                  ? "Selecciona un equipo para gestionar su plantilla"
                  : (activeInscripcion.estado_inscripcion === 'pendiente' || activeInscripcion.estado === 'pendiente')
                    ? "Plantilla bloqueada: Inscripción en revisión"
                    : (activeInscripcion.estado_inscripcion === 'borrador' || activeInscripcion.estado === 'borrador')
                      ? "Plantilla en borrador: Completa el registro en Inscripción"
                      : "Gestión de plantilla solo disponible para equipos aprobados";

                return (
                  <span
                    key={link.path}
                    className="text-sm font-medium text-gray-400 cursor-not-allowed py-2 select-none"
                    title={tooltip}
                  >
                    {link.name}
                  </span>
                );
              }
              
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => claseEnlace(isActive, 'text-gray-600')}
                >
                  {link.name}
                </NavLink>
              );
            })}

            {/* Separador de Vistas de Usuario para Super Admin */}
            {userRole === 'super_admin' && (
              <div className={`flex items-center gap-4 ml-4 pl-4 border-l-2 ${separador}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vistas de Usuario</span>
                {NAV_LINKS.public_admin.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => claseEnlace(isActive, 'text-gray-500')}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Separador de Vistas de Usuario para Delegado */}
            {userRole === 'delegado' && (
              <div className={`flex items-center gap-4 ml-4 pl-4 border-l-2 ${separador}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vistas de Usuario</span>
                {NAV_LINKS.public_delegado.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => claseEnlace(isActive, 'text-gray-500')}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}
            
            {/* Team Switcher Desktop */}
            {userRole === 'delegado' && inscripciones.length > 1 && (
              <div className="ml-4 pl-4 border-l border-gray-200">
                {renderTeamSwitcher()}
              </div>
            )}
          </div>

          {/* Acciones de usuario */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-2 pr-3.5 transition-all focus:outline-none ${
                    enInicio
                      ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                      : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  aria-expanded={isDropdownOpen}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 ${enInicio ? 'bg-oro text-marino ring-marino' : 'bg-primary-100 text-primary-700 ring-white'}`}>
                    {userInitial}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`text-xs font-bold max-w-[130px] truncate leading-tight ${enInicio ? 'text-crema' : 'text-gray-900'}`}>
                      {nombreUsuario}
                    </span>
                    <span className={`text-[10px] font-medium capitalize leading-tight ${enInicio ? 'text-slate-400' : 'text-gray-500'}`}>
                      {userRole === 'super_admin' ? 'Super Admin' : 'Delegado'}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white py-1.5 shadow-xl ring-1 ring-black/5 z-20 divide-y divide-gray-100">
                      <div className="px-4 py-2.5">
                        <p className="text-xs text-gray-500 font-medium">Conectado como</p>
                        <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{nombreUsuario}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary-50 text-primary-700">
                          {userRole === 'super_admin' ? 'Super Administrador' : 'Delegado'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/perfil"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          Mi Perfil
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ${
                  enInicio
                    ? 'border border-oro/70 text-oro hover:bg-oro hover:text-marino'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                }`}
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar para Mobile */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        links={links}
        userLinks={userLinks}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        topContent={renderTeamSwitcher()}
        disabledPaths={disabledPaths}
        userName={nombreUsuario}
        userRole={userRole}
      />
    </>
  );
}
