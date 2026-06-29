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
      <button onClick={() => login('fake-token', 'delegado')}>Login Delegado</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext Integration', () => {
  beforeEach(() => {
    // Purga el local storage para no contaminar estados
    localStorage.clear();
  });

  it('inicia en estado "No autenticado" si localStorage está vacío', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('No autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Ninguno');
  });

  it('permite iniciar sesión y actualiza localStorage y el DOM', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Login Delegado').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('delegado');
    expect(localStorage.getItem('access_token')).toBe('fake-token');
    expect(localStorage.getItem('user_role')).toBe('delegado');
  });

  it('permite cerrar sesión y limpia los valores', () => {
    // Arrange: Simular usuario logueado
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('user_role', 'super_admin');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('super_admin');

    // Act: Logout
    act(() => {
      screen.getByText('Logout').click();
    });

    // Assert: Datos limpios
    expect(screen.getByTestId('auth-status')).toHaveTextContent('No autenticado');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Ninguno');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
  });
});
