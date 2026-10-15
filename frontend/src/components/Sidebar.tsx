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
  /** Desde qué ancho se oculta (el mismo en que aparece la barra completa) */
  ocultarDesde?: string;
}

// Misma noche que el resto del sitio (marino, crema y oro)
const t = {
  panel: 'bg-marino border-r border-white/10',
  borde: 'border-white/10',
  logo: '/img/logo-recortado.webp',
  titulo: 'text-crema',
  cerrar: 'text-slate-300 hover:bg-white/10 hover:text-white',
  tarjeta: 'bg-white/5 border-white/10',
  inicial: 'bg-oro text-marino',
  nombre: 'text-crema',
  rol: 'text-slate-400',
  activo: 'bg-white/10 text-crema',
  inactivo: 'text-slate-300 hover:bg-white/5 hover:text-white',
  deshabilitado: 'text-slate-500 bg-white/5',
  rotulo: 'text-slate-500',
  icono: 'text-slate-400',
  salir: 'text-rose-300 hover:bg-rose-500/10',
};

const ROL: Record<string, string> = { super_admin: 'Super Admin', visor: 'Visor', delegado: 'Delegado' };

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
  userRole,
  ocultarDesde = 'lg:hidden',
}: SidebarProps) {
  const userInitial = userName ? userName.trim().charAt(0).toUpperCase() : 'U';
  const enlace = ({ isActive }: { isActive: boolean }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? t.activo : t.inactivo}`;

  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${ocultarDesde}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral deslizante */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col justify-between overflow-y-auto shadow-xl transition-transform duration-300 ease-in-out ${t.panel} ${ocultarDesde} ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className={`flex h-16 items-center justify-between border-b px-4 ${t.borde}`}>
            <div className="flex items-center gap-2">
              <img src={t.logo} alt="Torneos Baloncesto Manta Logo" className="h-7 w-7 object-contain" />
              <span className={`text-lg font-bold ${t.titulo}`}>Torneos Manta</span>
            </div>
            <button
              type="button"
              className={`rounded-md p-2 ${t.cerrar}`}
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-2 p-4">
            {isAuthenticated && (
              <div className={`mb-2 flex items-center gap-3 rounded-xl border p-3 ${t.tarjeta}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${t.inicial}`}>
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${t.nombre}`}>{userName || 'Usuario'}</p>
                  <p className={`text-[11px] font-medium ${t.rol}`}>{ROL[userRole ?? ''] ?? 'Delegado'}</p>
                </div>
              </div>
            )}

            {topContent && (
              <div className={`mb-2 border-b pb-3 ${t.borde}`}>
                {topContent}
              </div>
            )}
          {links.map((link) => {
            if (disabledPaths.includes(link.path)) {
              return (
                <span
                  key={link.path}
                  className={`cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium ${t.deshabilitado}`}
                  title="Opción no disponible en este momento"
                >
                  {link.name}
                </span>
              );
            }
            return (
              <NavLink key={link.path} to={link.path} onClick={onClose} className={enlace}>
                {link.name}
              </NavLink>
            );
          })}

          {userLinks.length > 0 && (
            <div className={`mt-4 border-t pt-4 ${t.borde}`}>
              <span className={`mb-2 block px-3 text-[10px] font-bold uppercase tracking-widest ${t.rotulo}`}>
                Vistas de Usuario
              </span>
              <div className="flex flex-col gap-1">
                {userLinks.map((link) => (
                  <NavLink key={link.path} to={link.path} onClick={onClose} className={enlace}>
                    {link.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {isAuthenticated && (
            <div className={`mt-4 flex flex-col gap-1 border-t pt-4 ${t.borde}`}>
              <Link
                to="/perfil"
                onClick={onClose}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${t.inactivo}`}
              >
                <User className={`h-4 w-4 ${t.icono}`} />
                Mi Perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${t.salir}`}
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
