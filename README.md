# EXACONTROL

Sistema de gestión, validación y control de ingreso de estudiantes a exámenes masivos. Desarrollado por SULLU SRL.

## Estructura del repositorio

```
SULLU/
├── Backend/       API en NestJS + Prisma + PostgreSQL
├── exacontrol/    Frontend en Next.js
├── package.json   Herramientas de repo (Husky + lint-staged)
└── .husky/        Hook de pre-commit
```

La raíz solo contiene tooling de repositorio, no es parte de la aplicación.

## Requisitos

- Node.js **20.19.0** (versión del servidor de despliegue). Usar `nvm`/`nvm-windows` para gestionar versiones sin conflictos con otras instalaciones de Node.
- Docker Desktop (base de datos local del Backend).
- npm.

## Instalación

Cada carpeta tiene dependencias independientes:

```
npm install              # raíz — una sola vez al clonar

cd Backend
npm install

cd ../exacontrol
npm install
```

Después de cada `git pull`, reinstalar en la carpeta cuyo `package.json` haya cambiado.

## Backend

### Puesta en marcha

```
cd Backend
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npm run start:dev
```

- API: `http://localhost:3000`
- Documentación (Swagger): `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

### Comandos

| Comando | Descripción |
|---|---|
| `npm run start:dev` | Levanta el servidor con recarga automática |
| `npm run lint` | ESLint + Prettier con autofix |
| `npm run format` | Solo Prettier |
| `npm run build` | Compila a `dist/` |
| `npm test` | Tests unitarios |
| `npm run test:e2e` | Tests end-to-end |
| `npx prisma studio` | Explorador visual de la base de datos |
| `npx prisma migrate dev --name <nombre>` | Genera y aplica una migración tras editar `schema.prisma` |

### Stack

- **NestJS** — API REST, arquitectura modular.
- **Prisma + PostgreSQL** — ORM y base de datos.
- **JWT** (`@nestjs/jwt`, `@nestjs/passport`) — autenticación, con guards por rol (`JwtAuthGuard`, `RolesGuard`, decorador `@Roles()`).
- **class-validator / class-transformer** — validación de DTOs.
- **Swagger** — documentación de API autogenerada.
- **nestjs-pino** — logging estructurado.
- **@nestjs/terminus** — health checks.
- **Husky + lint-staged** (raíz del repo) — lint automático en cada commit que toque `Backend/**/*.ts`.

## Frontend

Ver `exacontrol/README.md`.
