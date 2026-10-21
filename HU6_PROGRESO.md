# Progreso de Integración HU6 (Front + Back)

**Fecha:** 21 de Octubre de 2026
**Rama de trabajo:** `hu6-integracion` (base: `origin/develop`, merged with `origin/hu6-fe`)
**Destino de PR:** `develop`

---

## Estado General

- [x] **Fase 0: Auditoría y Planificación** (Completada)
  - Auditoría de backend, frontend, base de datos y modelo HU13.
  - Creación de rama `hu6-integracion` y resolución de conflictos de merge con `origin/hu6-fe`.
- [x] **Fase 1: Reestructurar Usuario / Estudiante** (Completada)
  - Vínculo 1:1 `Usuario` - `Estudiante`.
  - Columnas en esquema: `debe_configurar_perfil` (en `usuarios`), `qr_version` (en `estudiantes`).
  - Migración reversible: `20261021120000_hu6_usuario_estudiante_perfil` aplicada en PostgreSQL.
  - Script de backfill idempotente: `Backend/prisma/backfill-estudiantes-usuarios.ts`.
  - Compatibilidad total con modelo multi-rol de HU13 (Colaboradores).
- [x] **Fase 2: CSV y Modal de Importar Estudiantes** (Completada)
  - Entrada: 4 columnas base (`nombre,apellidos,codigo,ci`; CI opcional). Correo institucional autogenerado (`{codigo}@est.umss.edu.bo`).
  - Correo institucional visible en:
    - Vista previa y banner de resultados de importación (`UploadResultBanner.tsx`).
    - Tabla de estudiantes (`EstudianteTableRow.tsx` y `EstudianteCard.tsx`) debajo del CI.
    - Plantilla CSV descargable (`csv-template.ts` y `UploadModal.tsx`).
  - Validaciones: máx 2 MB / 5000 filas, código SIS duplicado, CI duplicado, manejo de CI opcional con clave temporal aleatoria (pendiente de CI).
  - Resumen y detalle fila por fila: "X creados, Y omitidos, Z con error".
  - Transacción atómica e idempotente (reimportación sin duplicados).
- [ ] **Fase 3: Login del Estudiante & Fix de Sesión en /portal** (Siguiente)
- [ ] **Fase 4: Configuración de Perfil (Foto, Datos, Password)** (Pendiente)
- [ ] **Fase 5: "Mis Exámenes" Conectado** (Pendiente)
- [ ] **Fase 6: Código QR Seguro y Credencial Móvil** (Pendiente)
- [ ] **Fase 7: Offline y Descarga de QR** (Pendiente)

---

## Migraciones Aplicadas
- `20261021120000_hu6_usuario_estudiante_perfil/migration.sql` (aplicada en PostgreSQL, con `rollback.sql`).

## Archivos Modificados / Creados
- `Backend/prisma/schema.prisma`
- `Backend/prisma/migrations/20261021120000_hu6_usuario_estudiante_perfil/migration.sql`
- `Backend/prisma/migrations/20261021120000_hu6_usuario_estudiante_perfil/rollback.sql`
- `Backend/prisma/backfill-estudiantes-usuarios.ts`
- `Backend/src/cargas-estudiantes/cargas-estudiantes.parser.ts`
- `Backend/src/cargas-estudiantes/cargas-estudiantes.service.ts`
- `Backend/src/cargas-estudiantes/cargas-estudiantes.spec.ts`
- `Backend/src/estudiantes/examen-estudiantes.service.ts`
- `Frontend/src/features/estudiantes/types/estudiante.types.ts`
- `Frontend/src/features/estudiantes/api/estudiante.service.ts`
- `Frontend/src/features/estudiantes/hooks/useEstudiantes.ts`
- `Frontend/src/features/estudiantes/components/EstudianteTableRow.tsx`
- `Frontend/src/features/estudiantes/components/EstudianteCard.tsx`
- `Frontend/src/features/estudiantes/components/UploadModal.tsx`
- `Frontend/src/features/estudiantes/components/UploadResultBanner.tsx`
- `Frontend/src/features/estudiantes/utils/csv-template.ts`
- `Frontend/src/shared/types/next-auth.d.ts`
- `Frontend/src/features/portal/components/StudentAuthGuard.tsx`
- `HU6_PROGRESO.md`

## Estado de Tests
- `Backend/src/cargas-estudiantes/cargas-estudiantes.spec.ts`: 6/6 tests pasando.
- Typecheck frontend (`tsc --noEmit`): 0 errores.
- Typecheck backend (`tsc --noEmit`): 0 errores.
