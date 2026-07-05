import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { getInscripciones } from '../features/equipos/api/equipos.api';

const NAV_LINKS = {
  public: [
    { name: 'Inicio', path: '/' },
    { name: 'Equipos', path: '/equipos' },
  ],
  delegado: [
    { name: 'Inicio', path: '/' },
    { name: 'Equipos', path: '/equipos' },
    { name: 'Mi Equipo', path: '/delegado/dashboard' },
    { name: 'Inscripción', path: '/delegado/inscripcion' },
    { name: 'Plantilla', path: '/delegado/plantilla' },
  ],
  super_admin: [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Torneos', path: '/admin/torneos' },
    { name: 'Equipos', path: '/admin/equipos' },
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
  const { userRole, isAuthenticated, logout, activeTeamId, setActiveTeamId } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const { data: response } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
    enabled: userRole === 'delegado',
  });
  const inscripciones = response?.data || [];

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
            return <option key={id} value={id}>{eq.nombre_equipo}</option>;
          })}
        </select>
      </div>
    );
  };

  const links = userRole === 'super_admin' ? NAV_LINKS.super_admin :
                userRole === 'delegado' ? NAV_LINKS.delegado : NAV_LINKS.public;

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            <Link to="/" className="text-xl font-bold text-primary-600">
              Torneos
            </Link>
          </div>

          {/* Enlaces de navegación (Desktop) */}
          <div className="hidden lg:flex lg:items-center lg:gap-6">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`
                }
              >
                {link.name}
              </NavLink>
            ))}
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
                  className="inline-flex items-center gap-2 rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 focus:outline-none"
                >
                  <User className="h-5 w-5" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                    <Link
                      to="/perfil"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mi Perfil
                    </Link>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
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
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        topContent={renderTeamSwitcher()}
      />
    </>
  );
}
