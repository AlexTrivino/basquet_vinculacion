/**
 * Contexto de autenticación global (AuthContext).
 *
 * Provee a toda la app:
 *   - `isAuthenticated`: booleano derivado de la existencia del token.
 *   - `userRole`: rol del usuario autenticado.
 *   - `login(token, role)`: persiste credenciales y actualiza estado.
 *   - `logout()`: purga credenciales y redirige a login.
 *
 * El token y el rol se persisten en localStorage para sobrevivir
 * recargas de página (aceptable para MVP — Supabase Auth lo hace igual).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

// ── Tipos estrictos ──────────────────────────────────────────────

export type UserRole = 'super_admin' | 'delegado' | null;

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole;
  activeTeamId: number | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, role: UserRole) => void;
  logout: () => void;
  setActiveTeamId: (id: number | null) => void;
}

// ── Contexto ─────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers de localStorage ──────────────────────────────────────

function loadInitialState(): AuthState {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role') as UserRole;
  const teamId = localStorage.getItem('ag_active_team_id');

  return {
    isAuthenticated: token !== null,
    userRole: token ? role : null,
    activeTeamId: teamId ? Number(teamId) : null,
  };
}

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const login = useCallback((token: string, role: UserRole) => {
    localStorage.setItem('access_token', token);

    if (role) {
      localStorage.setItem('user_role', role);
    }

    setState(prev => ({ ...prev, isAuthenticated: true, userRole: role }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('ag_active_team_id');
    window.location.href = '/auth/login';
  }, []);

  const setActiveTeamId = useCallback((id: number | null) => {
    setState(prev => ({ ...prev, activeTeamId: id }));
  }, []);

  useEffect(() => {
    if (state.activeTeamId !== null) {
      localStorage.setItem('ag_active_team_id', state.activeTeamId.toString());
    } else {
      localStorage.removeItem('ag_active_team_id');
    }
  }, [state.activeTeamId]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, setActiveTeamId }),
    [state, login, logout, setActiveTeamId],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook de consumo ──────────────────────────────────────────────

/**
 * Hook para consumir el contexto de autenticación.
 *
 * Lanza un error explícito si se usa fuera del `<AuthProvider>`,
 * evitando bugs silenciosos de `undefined`.
 *
 * @example
 * const { isAuthenticated, userRole, login, logout } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error(
      'useAuth() debe usarse dentro de un <AuthProvider>. '
      + 'Verifica que main.tsx envuelva la app con <AuthProvider>.',
    );
  }

  return context;
}
