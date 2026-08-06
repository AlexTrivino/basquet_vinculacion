import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Dummy component para consumir el hook global de autenticación
const TestComponent = () => {
  const { isAuthenticated, userRole, login, logout } = useAuth();

  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'Autenticado' : 'No autenticado'}</span>
      <span data-testid="user-role">{userRole || 'Ninguno'}</span>
      <button onClick={() => login('fake-token', 'delegado', 'Juan Perez', true)}>Login Delegado Recordar</button>
      <button onClick={() => login('fake-token-session', 'super_admin', 'Admin Temp', false)}>Login Temporal</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext Integration', () => {
  beforeEach(() => {
    // Purga ambos storages para no contaminar estados
    localStorage.clear();
    sessionStorage.clear();
  });

  it('inicia en estado "No autenticado" si los storages están vacíos', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('No autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Ninguno');
  });

  it('permite iniciar sesión con rememberMe=true y actualiza localStorage', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Login Delegado Recordar').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('delegado');
    expect(localStorage.getItem('access_token')).toBe('fake-token');
    expect(localStorage.getItem('user_role')).toBe('delegado');
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });

  it('permite iniciar sesión con rememberMe=false y actualiza sessionStorage', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Login Temporal').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('super_admin');
    expect(sessionStorage.getItem('access_token')).toBe('fake-token-session');
    expect(sessionStorage.getItem('user_role')).toBe('super_admin');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('restaura estado autenticado desde sessionStorage', () => {
    sessionStorage.setItem('access_token', 'fake-token-session');
    sessionStorage.setItem('user_role', 'delegado');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('delegado');
  });

  it('purga token expirado al inicio y arranca como no autenticado', () => {
    // Generar un JWT expirado (exp en el pasado)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: '123', exp: Math.floor(Date.now() / 1000) - 3600 }));
    const expiredToken = `${header}.${payload}.fakesignature`;

    localStorage.setItem('access_token', expiredToken);
    localStorage.setItem('user_role', 'super_admin');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('No autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Ninguno');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('permite cerrar sesión y limpia ambos storages', () => {
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('user_role', 'super_admin');
    sessionStorage.setItem('access_token', 'fake-token');
    sessionStorage.setItem('user_role', 'super_admin');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');

    // Act: Logout
    act(() => {
      screen.getByText('Logout').click();
    });

    // Assert: Datos limpios en ambos
    expect(screen.getByTestId('auth-status')).toHaveTextContent('No autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Ninguno');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
});
