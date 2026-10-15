import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
    { name: 'Llaves', path: '/admin/fase-final' },
    { name: 'Inscripciones', path: '/admin/auditoria' },
    { name: 'Sanciones', path: '/admin/sanciones' },
    { name: 'Auspiciantes', path: '/admin/patrocinadores' },
  ],
  public_admin: [
    { name: 'Inicio', path: '/' },
    { name: 'Directorio', path: '/equipos' },
    { name: 'Buscador', path: '/visor' },
  ],
  // Visor: solo lectura, buscar jugadores y ver sus fichas
  visor: [
    { name: 'Jugadores', path: '/visor' },
    { name: 'Inicio', path: '/' },
    { name: 'Equipos', path: '/equipos' },
  ],
};

export function Navbar() {
  const { userRole, isAuthenticated, logout, activeTeamId, userName } = useAuth();
  const { rules } = useBusinessRules();
  const maxEquiposDelegado = rules.MAX_EQUIPOS_POR_DELEGADO || 1;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const claseEnlace = (isActive: boolean) => `text-sm font-medium ${isActive ? 'text-crema' : 'text-slate-300 hover:text-white'}`;
  const separador = 'border-white/15';
  // El super_admin tiene 9 enlaces más las vistas de usuario: por debajo de 1280 px no caben y usa el menú lateral
  const desde = userRole === 'super_admin'
    ? { boton: 'xl:hidden', barra: 'xl:flex', usuario: 'xl:block' }
    : { boton: 'lg:hidden', barra: 'lg:flex', usuario: 'lg:block' };

  const { data: perfilRes } = useQuery({
    queryKey: ['mi_perfil'],
    queryFn: getPerfil,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const nombreUsuario = perfilRes?.data?.nombre || userName || (userRole === 'super_admin' ? 'Administrador' : userRole === 'visor' ? 'Visor' : 'Delegado');
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
                userRole === 'delegado' ? NAV_LINKS.delegado :
                userRole === 'visor' ? NAV_LINKS.visor : NAV_LINKS.public;

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
      <nav className={`sticky top-0 z-50 w-full border-b border-white/10 bg-marino`}>
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              className={`inline-flex items-center justify-center rounded-md p-2 ${desde.boton} text-slate-300 hover:bg-white/10 hover:text-white`}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-3">
              {/* En la portada va el recorte del escudo: sobre marino el logo con márgenes se pierde */}
              <img
                src="/img/logo-recortado.webp"
                alt="Torneos Baloncesto Manta Logo"
                className="h-12 w-12 object-contain"
              />
              <span className={`whitespace-nowrap text-xl font-bold ${userRole === 'super_admin' ? 'hidden min-[1800px]:block' : 'hidden sm:block'} text-crema`}>Torneos Baloncesto Manta</span>
            </Link>
          </div>

          <div className={`hidden flex-1 items-center justify-center gap-3 min-[1400px]:gap-6 2xl:gap-8 ${desde.barra}`}>
            {links.map((link) => {
              if (link.path === '/delegado/inscripcion' && isInscripcionDisabled) {
                return (
                  <span
                    key={link.path}
                    className="text-sm font-medium text-slate-500 cursor-not-allowed py-2 select-none"
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
                    className="text-sm font-medium text-slate-500 cursor-not-allowed py-2 select-none"
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
                  className={({ isActive }) => claseEnlace(isActive)}
                >
                  {link.name}
                </NavLink>
              );
            })}

            {/* Separador de Vistas de Usuario para Super Admin */}
            {userRole === 'super_admin' && (
              <div className={`flex items-center gap-4 ml-4 pl-4 border-l-2 ${separador}`}>
                <span className="hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest 2xl:inline">Vistas de Usuario</span>
                {NAV_LINKS.public_admin.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => claseEnlace(isActive)}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Separador de Vistas de Usuario para Delegado */}
            {userRole === 'delegado' && (
              <div className={`flex items-center gap-4 ml-4 pl-4 border-l-2 ${separador}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vistas de Usuario</span>
                {NAV_LINKS.public_delegado.map(link => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => claseEnlace(isActive)}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}
            
            {/* Team Switcher Desktop */}
            {userRole === 'delegado' && inscripciones.length > 1 && (
              <div className="ml-4 pl-4 border-l border-white/15">
                {renderTeamSwitcher()}
              </div>
            )}
          </div>

          {/* Acciones de usuario */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className={`relative hidden ${desde.usuario}`}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-2 pr-3.5 transition-all focus:outline-none border-white/15 bg-white/5 text-slate-200 hover:bg-white/10`}
                  aria-expanded={isDropdownOpen}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 bg-oro text-marino ring-marino`}>
                    {userInitial}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`text-xs font-bold max-w-[130px] truncate leading-tight text-crema`}>
                      {nombreUsuario}
                    </span>
                    <span className={`text-[10px] font-medium capitalize leading-tight text-slate-400`}>
                      {userRole === 'super_admin' ? 'Super Admin' : userRole === 'visor' ? 'Visor' : 'Delegado'}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)} 
                    />
                    <div className={`absolute right-0 z-20 mt-2 w-56 origin-top-right divide-y rounded-xl py-1.5 shadow-xl divide-white/10 bg-marino-claro ring-1 ring-oro/25 shadow-black/40`}>
                      <div className="px-4 py-2.5">
                        <p className={`text-xs font-medium text-slate-400`}>Conectado como</p>
                        <p className={`mt-0.5 truncate text-sm font-bold text-crema`}>{nombreUsuario}</p>
                        <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold bg-oro/15 text-oro`}>
                          {userRole === 'super_admin' ? 'Super Administrador' : userRole === 'visor' ? 'Visor' : 'Delegado'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/perfil"
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors text-slate-200 hover:bg-white/5`}
                        >
                          <User className={`h-4 w-4 text-slate-400`} />
                          Mi Perfil
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium transition-colors text-rose-300 hover:bg-rose-500/10`}
                        >
                          <LogOut className="h-4 w-4" />
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
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-oro/70 text-oro hover:bg-oro hover:text-marino`}
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
        ocultarDesde={desde.boton}
      />
    </>
  );
}
