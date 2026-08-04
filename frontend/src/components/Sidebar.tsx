import { X, LogOut, User } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

interface SidebarLink {
  name: string;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  links: SidebarLink[];
  userLinks?: SidebarLink[];
  isAuthenticated: boolean;
  onLogout: () => void;
  topContent?: React.ReactNode;
  disabledPaths?: string[];
  userName?: string;
  userRole?: string | null;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  links, 
  userLinks = [], 
  isAuthenticated, 
  onLogout, 
  topContent, 
  disabledPaths = [],
  userName,
  userRole
}: SidebarProps) {
  const userInitial = userName ? userName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral deslizante */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Torneos Baloncesto Manta Logo" className="h-6 w-6 object-contain" />
              <span className="text-lg font-bold text-primary-600">Torneos Manta</span>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-2 p-4">
            {isAuthenticated && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{userName || 'Usuario'}</p>
                  <p className="text-[11px] text-gray-500 font-medium capitalize">
                    {userRole === 'super_admin' ? 'Super Admin' : 'Delegado'}
                  </p>
                </div>
              </div>
            )}

            {topContent && (
              <div className="mb-2 pb-3 border-b border-gray-100">
                {topContent}
              </div>
            )}
          {links.map((link) => {
            if (disabledPaths.includes(link.path)) {
              return (
                <span
                  key={link.path}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed bg-gray-50"
                  title="Opción no disponible en este momento"
                >
                  {link.name}
                </span>
              );
            }
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {link.name}
              </NavLink>
            );
          })}

          {userLinks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="px-3 mb-2 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Vistas de Usuario
              </span>
              <div className="flex flex-col gap-1">
                {userLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2 text-sm font-medium ${
                        isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {isAuthenticated && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1">
              <Link
                to="/perfil"
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <User className="h-4 w-4 text-gray-500" />
                Mi Perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </nav>
        </div>
      </div>
    </>
  );
}
