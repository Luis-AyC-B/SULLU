# SULLU — EXACONTROL

Repositorio del sistema EXACONTROL (control de ingreso a exámenes masivos).

## Estructura

- `Backend/` — API en NestJS + Prisma + PostgreSQL.
- `exacontrol/` — Frontend en Next.js.
- Raíz (`SULLU/`) — solo herramientas de repo (Husky + lint-staged para el pre-commit lint del backend), no es parte de la app.

## Requisitos

- **Docker Desktop** — para levantar la base de datos local del Backend.
- **Node.js 20.19.0** para `Backend/` — es la versión disponible en el servidor de despliegue (WebTIS). Usa `nvm` (nvm-windows en Windows) para manejar esta versión sin perder otras que tengas instaladas:
  ```
  nvm install 20.19.0
  nvm use 20.19.0
  ```
  El archivo `Backend/.nvmrc` deja esto documentado. Si tienes otra versión de Node instalada "a mano" (no vía nvm) compitiendo en el PATH, desinstálala — nvm debe ser la única fuente de `node`/`npm` (verifica con `where node`, debería salir una sola ruta).

## Instalación

Cada carpeta tiene su propio `package.json` y `node_modules` independiente, así que hay que instalar en las tres por separado:

```
npm install              # en la raíz (SULLU/) — solo una vez al clonar

cd Backend
npm install               # dependencias del backend

cd ../exacontrol
npm install               # dependencias del frontend
```

El `npm install` de la raíz activa automáticamente el hook de pre-commit (lint del backend antes de cada commit que toque `Backend/**/*.ts`). No hace falta repetirlo salvo que cambie el `package.json` de la raíz.

Después de cada `git pull`, si `Backend/package.json` o `exacontrol/package.json` cambiaron, corre `npm install` dentro de esa carpeta para traer las dependencias nuevas.

## Backend — puesta en marcha desde cero

1. **Variables de entorno**: copia `Backend/.env.example` a `Backend/.env` (este último nunca se sube al repo). Ajusta `JWT_SECRET` si quieres, `DATABASE_URL` ya viene lista para el contenedor de Docker de abajo.

2. **Levantar PostgreSQL con Docker** (versión 15.10, igual a la del servidor WebTIS):
   ```
   cd Backend
   docker compose up -d
   ```
   Después de la primera vez, puedes arrancar/parar el contenedor desde la interfaz de Docker Desktop sin volver a usar la terminal.

3. **Aplicar las migraciones** (crea las tablas en la base):
   ```
   npx prisma migrate dev
   ```
   Cuando cambies `prisma/schema.prisma`, vuelve a correr este comando con un nombre descriptivo: `npx prisma migrate dev --name algo_descriptivo`. Las migraciones generadas (`prisma/migrations/`) sí se suben al repo — todo el equipo y el servidor deben aplicar las mismas.

4. **Levantar el servidor**:
   ```
   npm run start:dev
   ```
   - API en `http://localhost:3000`
   - Documentación interactiva (Swagger) en `http://localhost:3000/api/docs`
   - Health check en `http://localhost:3000/health`

5. **Ver/editar datos visualmente** (opcional):
   ```
   npx prisma studio
   ```
   Abre `http://localhost:5555`. Necesita que el contenedor de Docker esté corriendo.

### Comandos útiles del Backend

- `npm run lint` — ESLint + Prettier con autofix.
- `npm run format` — solo Prettier.
- `npm run build` — compila a `dist/`.
- `npm test` / `npm run test:e2e` — tests unitarios / end-to-end.

### Qué hay ya armado en el Backend

- **Prisma** (`prisma/schema.prisma`) con el modelo de datos completo (Rol, Usuario, CargaEstudiantes, Estudiante, Ambiente, Examen, CodigoQr, Ingreso, Habilitacion).
- **Auth JWT** (`src/auth/`) — login por `POST /auth/login`, guards (`JwtAuthGuard`, `RolesGuard`) y decorador `@Roles()` para proteger endpoints por rol. **Pendiente a propósito**: la verificación de contraseña todavía no está implementada (falta agregar `bcrypt`/`argon2`), así que el login no funciona de punta a punta todavía.
- **Swagger** en `/api/docs`, generado automáticamente desde los DTOs/controllers.
- **Logging estructurado** con `nestjs-pino` (JSON en producción, formato legible en desarrollo).
- **Health check** en `/health`, valida que la conexión a PostgreSQL esté viva.
- **`qrcode`** instalado, listo para usarse cuando se construya el módulo de códigos QR (todavía no implementado).
- **ESLint + Prettier** configurados, con lint automático en pre-commit (solo sobre archivos de `Backend/`, vía Husky + lint-staged en la raíz).

### Nota sobre versiones de paquetes

Al instalar `@nestjs/jwt`, `@nestjs/passport` y `@nestjs/terminus`, evita instalar la última versión mayor a ciegas (`npm install <paquete>` sin especificar versión) — sus versiones más nuevas (12.x / 11.1.x en adelante) se publican como **ESM puro**, incompatible con este proyecto (que usa CommonJS). Rompen tanto los tests (`npm test` / `npm run test:e2e`) como el arranque real del servidor compilado. Se fijaron en `^11` para estos tres paquetes — si en el futuro se actualiza el proyecto entero a ESM, se puede revisar esto de nuevo.

### Pendiente / próximos pasos

- Verificación de contraseña en el login (elegir `bcrypt` o `argon2`).
- Módulos de negocio: `usuarios`, `estudiantes`, `examenes`, `ambientes`, `habilitaciones`, `ingresos`, `codigos-qr` (por ahora solo existe la infraestructura base: auth, prisma, health, logging, docs).
- `RolesGuard` actualmente compara contra el rol embebido en el JWT; el diseño original contempla un `RolesService` con permisos dinámicos (`roles/` aún no existe).
