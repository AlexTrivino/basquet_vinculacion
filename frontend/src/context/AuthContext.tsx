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
import {
  AUTH_KEYS,
  getAuthItem,
  setAuthItem,
  removeAuthItem,
  clearAllAuthStorage,
  isTokenExpired,
} from '../utils/authStorage';

// ── Tipos estrictos ──────────────────────────────────────────────

export type UserRole = 'super_admin' | 'delegado' | null;

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole;
  userName: string | null;
  activeTeamId: number | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, role: UserRole, userName?: string | null, rememberMe?: boolean) => void;
  logout: () => void;
  setActiveTeamId: (id: number | null) => void;
  setUserName: (name: string | null) => void;
}

// ── Contexto ─────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers de inicialización ────────────────────────────────────

function loadInitialState(): AuthState {
  const token = getAuthItem(AUTH_KEYS.ACCESS_TOKEN);

  // Si no hay token o ya expiró según el timestamp de su payload, purgamos y retornamos estado limpio
  if (!token || isTokenExpired(token)) {
    if (token) {
      clearAllAuthStorage();
    }
    return {
      isAuthenticated: false,
      userRole: null,
      userName: null,
      activeTeamId: null,
    };
  }

  const role = getAuthItem(AUTH_KEYS.USER_ROLE) as UserRole;
  const userName = getAuthItem(AUTH_KEYS.USER_NAME);
  const teamId = getAuthItem(AUTH_KEYS.ACTIVE_TEAM_ID);

  return {
    isAuthenticated: true,
    userRole: role,
    userName: userName || null,
    activeTeamId: teamId ? Number(teamId) : null,
  };
}

// Helper para saber si la sesión actual es persistente (localStorage) o temporal (sessionStorage)
function isSessionPersistent(): boolean {
  try {
    return localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN) !== null;
  } catch {
    return true;
  }
}

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const login = useCallback((token: string, role: UserRole, userName?: string | null, rememberMe: boolean = true) => {
    setAuthItem(AUTH_KEYS.ACCESS_TOKEN, token, rememberMe);

    if (role) {
      setAuthItem(AUTH_KEYS.USER_ROLE, role, rememberMe);
    }
    if (userName) {
      setAuthItem(AUTH_KEYS.USER_NAME, userName, rememberMe);
    }

    setState(prev => ({ 
      ...prev, 
      isAuthenticated: true, 
      userRole: role,
      userName: userName || prev.userName || null
    }));
  }, []);

  const logout = useCallback(() => {
    clearAllAuthStorage();
    setState({ isAuthenticated: false, userRole: null, userName: null, activeTeamId: null });
    window.location.href = '/auth/login';
  }, []);

  const setActiveTeamId = useCallback((id: number | null) => {
    setState(prev => ({ ...prev, activeTeamId: id }));
  }, []);

  const setUserName = useCallback((name: string | null) => {
    const persistent = isSessionPersistent();
    if (name) {
      setAuthItem(AUTH_KEYS.USER_NAME, name, persistent);
    } else {
      removeAuthItem(AUTH_KEYS.USER_NAME);
    }
    setState(prev => ({ ...prev, userName: name }));
  }, []);

  useEffect(() => {
    const persistent = isSessionPersistent();
    if (state.activeTeamId !== null) {
      setAuthItem(AUTH_KEYS.ACTIVE_TEAM_ID, state.activeTeamId.toString(), persistent);
    } else {
      removeAuthItem(AUTH_KEYS.ACTIVE_TEAM_ID);
    }
  }, [state.activeTeamId]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, setActiveTeamId, setUserName }),
    [state, login, logout, setActiveTeamId, setUserName],
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
