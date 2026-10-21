# Progreso de Integración HU6 (Front + Back)

**Fecha:** 21 de Octubre de 2026
**Rama de trabajo:** `hu6-integracion` (base: `origin/develop`, merged con `origin/hu6-fe`)
**Destino de PR:** `develop`

---

## Estado General de Fases

- [x] **Fase 0: Auditoría y Planificación** (Completada)
  - Auditoría de backend, frontend, base de datos y compatibilidad con HU13 (Colaboradores).
  - Creación de rama `hu6-integracion` y resolución de conflictos de merge con `origin/hu6-fe`.
- [x] **Fase 1: Reestructurar Usuario / Estudiante** (Completada & Commiteada `ce2140b`)
  - Vínculo 1:1 `Usuario` - `Estudiante` mediante FK `usuarioId` en `estudiantes`.
  - Columnas añadidas al esquema: `debe_configurar_perfil` (en `usuarios`, default `true`), `qr_version` (en `estudiantes`, default `1`).
  - Migración reversible: `20261021120000_hu6_usuario_estudiante_perfil` aplicada en PostgreSQL (con `rollback.sql`).
  - Script de backfill idempotente: `Backend/prisma/backfill-estudiantes-usuarios.ts`.
  - Compatibilidad total con modelo multi-rol de HU13 (un estudiante puede recibir el rol "Personal de control" sin duplicar usuario).
- [x] **Fase 2: CSV y Modal de Importar Estudiantes** (Completada & Commiteada `ce2140b`)
  - Entrada: 4 columnas base (`nombre,apellidos,codigo,ci`; CI opcional). Correo institucional autogenerado (`{codigo}@est.umss.edu.bo`).
  - Correo institucional visible en:
    - Vista previa y banner de resultados de importación (`UploadResultBanner.tsx`).
    - Tabla y cards de estudiantes (`EstudianteTableRow.tsx` y `EstudianteCard.tsx`) debajo del CI.
    - Plantilla CSV descargable (`csv-template.ts` y `UploadModal.tsx`).
  - Validaciones: máx 2 MB / 5000 filas, código SIS duplicado, CI duplicado, manejo de CI opcional con clave temporal aleatoria ("pendiente de CI").
  - Resumen y detalle fila por fila: "X creados, Y omitidos, Z con error".
  - Transacción atómica e idempotente (reimportación sin duplicados).
- [x] **Fase 3: Login del Estudiante & Fix de Sesión en /portal** (Completada & Commiteada `da8e2ad`)
  - Causa raíz del bug `/portal`: `AuthService.login()` firmaba JWTs usando `jwtSecret` global (`JWT_SECRET`), mientras que `EstudianteJwtGuard` verificaba exclusivamente con `JWT_ESTUDIANTE_SECRET`. El guard respondía HTTP 401, lo cual disparaba el interceptor de `apiClient.ts` cerrando la sesión con toast "Sesión inválida o iniciada en otro dispositivo".
  - Solución de raíz: `EstudianteJwtGuard` ahora valida contra `jwtSecret` institucional, verifica `sessionId` en base de datos para garantizar sesión única activa sin choques, y no expulsa al usuario erróneamente.
  - Bloqueo IDOR estricto: el id del estudiante se extrae de la sesión y cualquier parámetro ajeno en URL/body es rechazado con 403 y registrado en bitácora.
- [x] **Fase 4: Configuración de Perfil (Foto, Datos, Password)** (Completada & Commiteada `da8e2ad`)
  - Bloqueo de endpoints del portal con 403 `PERFIL_INCOMPLETO` hasta que `debeConfigurarPerfil = false`.
  - Paso 1 (Foto): Validación de formato JPG/PNG por magic bytes en el servidor, tamaño máx. 2 MB, dimensiones mínimas 600x600 px y relación cuadrada 1:1. Almacenamiento local en `uploads/estudiantes/` con UUID y registro en `FotoEstudiante` con hash SHA-256 (estado ACTIVA, anteriores pasan a REEMPLAZADA).
  - Hook Sprint 3: Interfaz `ValidadorFoto` con `ValidadorFotoStubService` que aprueba por defecto dejando lista la extensión biométrica.
  - Paso 2 (Datos personales): Actualización atómica de CI y teléfono celular boliviano (8 dígitos). No permite vaciar el CI si ya existía.
  - Paso 3 (Nueva contraseña): Validación de 8-12 caracteres con letras y números; no permite que sea igual al actual ni al CI.
  - Al completar: transacción atómica que pone `debeConfigurarPerfil = false`, incrementa `qrVersion`, preserva la sesión activa sin deslogueos indeseados y registra en auditoría. Respuestas por clave incorrecta devuelven HTTP 400 (nunca 401 para evitar deslogueo).
  - **Fix /portal/perfil (403 en cambiar-password y sessionId)**:
    - Corrección en `EstudianteJwtGuard`: la lista blanca de rutas exentas durante configuración de perfil incluía `/password` pero no hacía match con `cambiar-password` (`-password` en lugar de `/password`). Se amplió la lista blanca para cubrir explícitamente `cambiar-password` y `password`.
    - Generación y asignación de `sessionId` único para estudiantes en el login general (`AuthService.login()`) y `EstudianteAuthService`, garantizando control de sesión única activa.
    - Mensajes de error reales del backend (400 y 403) ahora se propagan y visualizan directamente en la UI del formulario de configuración de perfil en lugar del genérico "Ocurrió un error inesperado".
    - Respeto estricto a privacidad: cero logging de headers `authorization`.
- [x] **Fase 5: "Mis Exámenes" Conectado** (Completada & Commiteada `da8e2ad`)
  - Endpoint `GET /estudiantes/me/examenes` filtrando por el estudiante autenticado.
  - Soporte para estados Habilitado / Inhabilitado según la asignación docente (HU6 Escenario Positivo 4: inhabilitados no pueden generar QR).
  - Manejo de lista vacía ("No tienes exámenes habilitados") y reintento sin pantalla en blanco ante fallos de red.
- [x] **Fase 6: Código QR Seguro y Credencial Móvil** (Completada & Commiteada `da8e2ad`)
  - QR contiene URL con token firmado HMAC: `https://<dominio>/qr/v/<token>`.
  - Token incluye versión del QR (`qrVersion`) y expira; revocado automáticamente si el estudiante cambia foto o contraseña.
  - Vista pública para cámara móvil (`/qr/v/[token]` y `/validar-qr`): muestra foto ACTIVA servida por stream seguro (`/qr/foto?token=...`), nombre, SIS, carrera, exámenes habilitados y leyenda "Código personal e intransferible" sin exponer CI completo, teléfono ni correo.
  - Rate limiting (30 req/min por IP) y registro en `bitacora_auditoria` en cada escaneo.
  - Modal en portal con botón "Generar QR" y botón "Descargar QR".
- [x] **Fase 7: Offline y Descarga de QR** (Completada)
  - Descarga de credencial QR en formato PNG de alta resolución (`QR-<sis>.png`).
  - Soporte offline mediante `localStorage` con clave temporal `exacontrol_offline_*`. Si falla la conexión, muestra los exámenes y QR guardados con advertencia visual "Estás sin conexión, mostrando datos guardados el [fecha]".
  - Purga automática y segura del almacenamiento sensible (`limpiarCacheOfflineEstudiante()`) al cerrar sesión voluntariamente o por expiración (401).

---

## Migraciones Aplicadas
- `20261021120000_hu6_usuario_estudiante_perfil/migration.sql` (aplicada en PostgreSQL, con `rollback.sql`).

## Estado de Tests
- `Backend/src/cargas-estudiantes/cargas-estudiantes.spec.ts`: 6/6 tests pasando (100%).
- `Backend/src/portal-estudiante/portal-estudiante.spec.ts`: 11/11 tests pasando (100%, incluye test de flujo cambiar-password con debeConfigurarPerfil=true).
- `Frontend/src/features/portal/__tests__`: 24/24 tests pasando (100%, 4 test suites).
- Frontend Jest Suite completa: 10 suites pasando, 71 tests pasando, 0 fallando (100%).
- Backend Typecheck (`tsc --noEmit`): 0 errores.
- Frontend Typecheck (`tsc --noEmit`): 0 errores.
- ESLint (Husky / lint-staged): 0 errores.

