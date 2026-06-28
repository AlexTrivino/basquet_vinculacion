import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

const NAV_LINKS = {
  public: [
    { name: 'Inicio', path: '/' },
  ],
  delegado: [
    { name: 'Inicio', path: '/' },
    { name: 'Mi Equipo', path: '/delegado/dashboard' },
    { name: 'Inscripción', path: '/delegado/inscripcion' },
    { name: 'Plantilla', path: '/delegado/plantilla' },
  ],
  super_admin: [
    { name: 'Inicio', path: '/' },
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Auditoría', path: '/admin/auditoria' },
    { name: 'Partidos', path: '/admin/partidos' },
    { name: 'Estadísticas', path: '/admin/estadisticas' },
  ],
};

export function Navbar() {
  const { userRole, isAuthenticated, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const links = userRole === 'super_admin' ? NAV_LINKS.super_admin :
                userRole === 'delegado' ? NAV_LINKS.delegado : NAV_LINKS.public;

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
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
          </div>

          {/* Acciones de usuario */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
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
      />
    </>
  );
}
