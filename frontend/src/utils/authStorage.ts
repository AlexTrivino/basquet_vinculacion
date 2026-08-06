/**
 * Utilidad de almacenamiento de autenticación con soporte dual:
 * - localStorage: Sesión persistente cuando el usuario marca "Recordarme".
 * - sessionStorage: Sesión temporal que se destruye automáticamente al cerrar la pestaña/navegador.
 */

export const AUTH_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_ROLE: 'user_role',
  USER_NAME: 'user_name',
  ACTIVE_TEAM_ID: 'ag_active_team_id',
} as const;

/**
 * Obtiene un elemento de autenticación buscando primero en localStorage y luego en sessionStorage.
 */
export function getAuthItem(key: string): string | null {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) {
      return localValue;
    }
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Guarda un elemento en localStorage (si rememberMe es true) o sessionStorage (si rememberMe es false),
 * limpiando el almacenamiento opuesto para garantizar consistencia.
 */
export function setAuthItem(key: string, value: string, rememberMe: boolean = true): void {
  try {
    if (rememberMe) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error al guardar en el storage de autenticación (${key}):`, error);
  }
}

/**
 * Remueve un elemento de ambos almacenamientos.
 */
export function removeAuthItem(key: string): void {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(`Error al remover del storage (${key}):`, error);
  }
}

/**
 * Purga completamente todos los datos de autenticación de localStorage y sessionStorage.
 */
export function clearAllAuthStorage(): void {
  try {
    Object.values(AUTH_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error al purgar el almacenamiento de autenticación:', error);
  }
}

/**
 * Helper rápido para obtener el access_token actual.
 */
export function getAuthToken(): string | null {
  return getAuthItem(AUTH_KEYS.ACCESS_TOKEN);
}

/**
 * Verifica si un token JWT ya expiró analizando su payload codificado en Base64.
 * Incluye un margen de tolerancia (skew) de 10 segundos.
 */
export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      // No es un JWT estándar de 3 partes (ej. fake-token en pruebas)
      return false;
    }

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedJson = JSON.parse(
      decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      ),
    );

    if (typeof decodedJson.exp !== 'number') {
      return false;
    }

    // Comparamos tiempo actual en segundos con exp (con margen de 10s)
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= decodedJson.exp - 10;
  } catch {
    // Si hay error en decodificación y parecía un JWT, consideramos inválido
    return true;
  }
}
