import { X, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarLink {
  name: string;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  links: SidebarLink[];
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function Sidebar({ isOpen, onClose, links, isAuthenticated, onLogout }: SidebarProps) {
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
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-xl font-bold text-primary-600">Menú</span>
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
          {links.map((link) => (
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
          ))}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
