---
name: backend-flask
description: Activate when modifying or extending the Flask backend: models, services, routes, schemas, migrations, or utilities. Stack: Flask 3.1 + SQLAlchemy 2.0 + Marshmallow + Alembic + Supabase PostgreSQL. The backend Core (Phases 1-8) is complete — extend without breaking existing patterns.
---

# Skill: Backend Flask — Torneos de Baloncesto

El Core del backend (Fases 1–8) está **completado**. Este skill aplica cuando
se extiende o corrige el backend existente.

## Reglas de Arquitectura (no negociables)

1. **Rutas delgadas:** Las funciones de blueprint no contienen lógica de negocio.
   Solo reciben → validan con Marshmallow → delegan al servicio → responden.
2. **Respuestas estandarizadas:** Siempre usar `api_response()` / `api_error()` de `utils/response.py`.
3. **Paginación obligatoria:** Todo GET de listado usa `paginate_query()`.
4. **Schemas DTO:** Usar schemas diferenciados (Public, Admin, Create, Update). No filtrar IDs
   sensibles en Public. Usar `Nested` para relaciones en vez de queries adicionales.
5. **Anti N+1:** Usar `joinedload` (1:1) o `selectinload` (1:N). Nunca loops con queries.
6. **Bulk inserts:** `db.session.execute(insert(Model), lista)` — nunca `for` con `add()`.
7. **Transacciones:** `flush()` antes de `commit()` para detectar `IntegrityError` con rollback limpio.
8. **Soft delete:** Todos los modelos tienen `.activos()` classmethod. Usar obligatoriamente en GETs.

## Convención de Migraciones

Alembic no detecta `CheckConstraint` automáticamente.
Ante cambios en constraints o enums, crear migración manual:

```python
def upgrade():
    op.drop_constraint('ck_nombre', 'tabla', type_='check')
    op.create_check_constraint('ck_nombre', 'tabla', "col IN ('a', 'b', 'c')")

def downgrade():
    op.drop_constraint('ck_nombre', 'tabla', type_='check')
    op.create_check_constraint('ck_nombre', 'tabla', "col IN ('a', 'b')")
```

## Auth Middleware

```python
@bp.route('/ruta', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def mi_ruta():
    g.usuario_id   # UUID del usuario autenticado
    g.usuario_rol  # Rol verificado contra tabla usuarios
```

## Endpoints Disponibles (referencia rápida)

Ver `backend/docs/api_referencia.md` para la lista completa.

API base: `http://localhost:5000/api`

Blueprints registrados: `health`, `torneos`, `categorias`, `equipos`,
`inscripciones`, `jugadores`, `plantillas`, `partidos`, `estadisticas`, `reportes`.
