---
name: frontend-react
description: Activate when building React components, pages, hooks, Axios services, Tailwind styles, or any frontend code for the basketball tournament platform. Stack: Vite + React 18 + TypeScript + Tailwind CSS + React Hook Form + Zod + React Router v6 + Lucide-React.
---

# Skill: Frontend React — Torneos de Baloncesto

Este skill complementa las reglas del `AGENTS.md` con directivas específicas
de implementación para el frontend.

## Convenciones de Componentes

- Todos los componentes en **TypeScript** con props tipadas explícitamente.
- Nombre de archivo: `PascalCase.tsx` para componentes, `camelCase.ts` para hooks y utils.
- Exportaciones: `export default` para componentes de página, `export` nombrado para
  componentes de UI Kit.
- Estilo: Tailwind classes inline. No usar `style={{}}` excepto para valores dinámicos
  imposibles de expresar en Tailwind.

## Axios — Convención de Llamadas

```typescript
// src/api/axios.config.ts — instancia base
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Request interceptor: inyectar JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: manejar 401/403
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if ([401, 403].includes(err.response?.status)) {
      localStorage.clear();
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

## Zod + React Hook Form — Patrón estándar

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string().min(3).max(100),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Variables de Entorno

El frontend usa el prefijo `VITE_`:
- `VITE_API_URL` — URL base del backend (ej. `http://localhost:5000/api`)
- `VITE_SUPABASE_URL` — URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` — Clave pública de Supabase

## Importaciones de Íconos (Lucide)

```typescript
// ✅ Correcto: import específico (tree-shaking)
import { Trophy, Users, Calendar } from 'lucide-react';

// ❌ Incorrecto: import global
import * as Icons from 'lucide-react';
```
