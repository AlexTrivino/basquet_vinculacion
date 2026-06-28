# Documento de Arquitectura y Directivas de Desarrollo Frontend
**Proyecto:** Plataforma de Torneos de Baloncesto (Frontend)
**Audiencia Objetivo:** Agente de Desarrollo de IA (Agy CLI)
**Rol Asignado al Agente:** Tech Lead & Senior React Developer

## 1. Stack Tecnológico Estricto
- **Core:** React 18+ inicializado con Vite.
- **Enrutamiento:** React Router DOM v6 (usando la API de componentes o `createBrowserRouter`).
- **Estilos:** Tailwind CSS + UI Kit genérico (Lucide-React para íconos).
- **Manejo de Estado:** Context API nativo (exclusivo para Autenticación).
- **Capa de Red:** Axios.
- **Formularios:** React Hook Form (gestión de estado de inputs) + Zod (validación de esquemas).

## 2. Arquitectura de Carpetas (Feature-Driven Development)
Queda estrictamente prohibido utilizar una estructura plana. El código debe organizarse separando la infraestructura de los dominios de negocio:

```text
src/
 ├─ api/         # Instancia global de Axios e interceptores (axios.config.js).
 ├─ components/  # UI genérica y reutilizable (Button, Modal, DataGrid, StatusBadge).
 ├─ context/     # AuthContext.jsx (Manejo de estado de sesión global).
 ├─ features/    # Agrupación por dominio de negocio (ej. torneos, equipos, admin).
 │   ├─ auth/
 │   └─ delegados/
 ├─ hooks/       # Custom hooks transversales (ej. useFetch, useAuth).
 ├─ pages/       # Vistas de alto nivel que ensamblan los features para el Router.
 ├─ routes/      # Configuración centralizada de React Router y Guardias (HOCs).
 └─ utils/       # Funciones puras (formateo de fechas, parseo de JWT, helpers).****
```

## 3. Directivas de la Capa de Red (Networking & Seguridad)

El frontend se comunica con una API REST en Flask (Dominio base: `http://localhost:5000/api`).

- **El Cliente Axios:** Se debe exportar una instancia configurada de Axios desde `src/api/axios.config.js`.
    
- **Interceptor de Request:** Antes de cada petición, el interceptor debe buscar el `access_token` en `localStorage`. Si existe, debe inyectarlo obligatoriamente en el header: `Authorization: Bearer <token>`.
    
- **Interceptor de Response:** Debe capturar globalmente los errores. Si el servidor devuelve `401 Unauthorized` o `403 Forbidden`, el interceptor debe purgar el `localStorage` y forzar una redirección a `/auth/login`.
    

## 4. Gestión de Estado y Control de Acceso (RBAC)

La seguridad en el cliente es un reflejo de la API.

- **AuthContext:** Proveerá a toda la app las variables: `isAuthenticated` (boolean), `userRole` ('super_admin', 'delegado', o null), y los métodos `login` y `logout`.
    
- **Rutas Protegidas:** Se debe crear un componente contenedor (HOC) llamado `<ProtectedRoute allowedRoles={['...']} />`. Si el `userRole` del contexto no coincide con los `allowedRoles`, el componente renderizará un `<Navigate to="/unauthorized" />`.
    

## 5. Directivas de Rendimiento y UI

- **Formularios Complejos:** Todas las vistas de creación (registro de equipos, plantillas, resultados de partidos) deben implementarse con **React Hook Form**. Prohibido usar componentes controlados con múltiples `useState` para evitar re-renders. Las reglas de validación (tamaño de strings, formatos de email) se delegarán a **Zod**.
    
- **UX Asíncrona:** Toda mutación (POST, PUT, DELETE) debe reflejarse en la UI deshabilitando los botones de envío (estado _disabled_ + _spinner_) mientras la promesa se resuelve.
    
- **Manejo de Archivos:** Las peticiones que envíen archivos (Cédulas, Logos) deben configurar automáticamente el header `Content-Type: multipart/form-data` en la llamada a Axios.
    

## 6. Plan de Ejecución Secuencial (Hoja de Ruta)

_Agente, no intentes construir toda la aplicación en un solo paso. Espera las instrucciones del usuario para avanzar fase por fase:_

1. **Fase 1:** Andamiaje e inicialización (Vite, Tailwind, estructura de carpetas).
    
2. **Fase 2:** Infraestructura (Axios interceptors, AuthContext, ProtectedRoute, Router base).
    
3. **Fase 3:** UI Kit base (Componentes reutilizables: Navbar iterativo por rol, Tablas genéricas, Formularios base).
    
4. **Fase 4:** Dominio Auth (Pantalla de Login conectada a la API).
    
5. **Fase 5:** Dominio Público (Home, Tablas de Posiciones de solo lectura).
    
6. **Fase 6:** Dominio Delegado (Dashboard, registro de plantillas, carga de PDFs e Imágenes).
    
7. **Fase 7:** Dominio Admin (Mesa de control, carga de estadísticas de partidos).