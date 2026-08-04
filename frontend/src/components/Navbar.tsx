import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, User, Shield, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
  ],
  public_admin: [
    { name: 'Inicio', path: '/' },
    { name: 'Directorio', path: '/equipos' },
  ],
};

export function Navbar() {
  const { userRole, isAuthenticated, logout, activeTeamId, setActiveTeamId, userName } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

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

  const activeInscripcion = activeTeamId 
    ? inscripciones.find(ins => (ins.equipo?.id_equipo || ins.equipo?.id) === activeTeamId)
    : (inscripciones.length === 1 ? inscripciones[0] : null);

  const isPlantillaDisabled = 
    userRole === 'delegado' && (
      !activeInscripcion || 
      (activeInscripcion.estado_inscripcion !== 'aprobado' && activeInscripcion.estado !== 'aprobado')
    );

  const isInscripcionDisabled = 
    userRole === 'delegado' && 
    inscripciones.length >= 3;

  const renderTeamSwitcher = () => {
    if (userRole !== 'delegado' || inscripciones.length <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-gray-400 hidden lg:block" />
        <select
          value={activeTeamId || ''}
          onChange={(e) => setActiveTeamId(Number(e.target.value))}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 cursor-pointer outline-none hover:bg-gray-100 transition-colors"
        >
          <option value="" disabled>Seleccionar equipo...</option>
          {inscripciones.map(ins => {
            const eq = ins.equipo;
            if (!eq) return null;
            const id = eq.id_equipo || eq.id;
            const catNombre = ins.categoria?.nombre_categoria || '';
            const catGenero = ins.categoria?.genero_categoria || '';
            const catLabel = catNombre ? ` — ${catNombre} (${catGenero})` : '';
            return <option key={id} value={id}>{eq.nombre_equipo}{catLabel}</option>;
          })}
        </select>
      </div>
    );
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
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Botón hamburguesa (Mobile) */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Torneos Baloncesto Manta Logo" className="h-12 w-12 object-contain" />
              <span className="text-xl font-bold text-primary-600 hidden sm:block">Torneos Baloncesto Manta</span>
            </Link>
          </div>

          {/* Enlaces de navegación (Desktop) */}
          <div className="hidden lg:flex flex-1 justify-center lg:items-center lg:gap-8">
            {links.map((link) => {
              if (link.path === '/delegado/inscripcion' && isInscripcionDisabled) {
                return (
                  <span
                    key={link.path}
                    className="text-sm font-medium text-gray-400 cursor-not-allowed py-2 select-none"
                    title="Límite de 3 equipos alcanzado"
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
                  className={({ isActive }) =>
                    `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`
                  }
                >
                  {link.name}
                </NavLink>
              );
            })}

            {/* Separador de Vistas de Usuario para Super Admin */}
            {userRole === 'super_admin' && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l-2 border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vistas de Usuario</span>
                {NAV_LINKS.public_admin.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'}`}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Separador de Vistas de Usuario para Delegado */}
            {userRole === 'delegado' && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l-2 border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vistas de Usuario</span>
                {NAV_LINKS.public_delegado.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'}`}>
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
                  className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-2 pr-3.5 text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold ring-2 ring-white">
                    {userInitial}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-900 max-w-[130px] truncate leading-tight">
                      {nombreUsuario}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium capitalize leading-tight">
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
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 shadow-sm"
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
