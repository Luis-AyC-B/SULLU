# SULLU — EXACONTROL

Repositorio del sistema EXACONTROL (control de ingreso a exámenes masivos).

## Estructura

- `Backend/` — API en NestJS + Prisma + PostgreSQL.
- `exacontrol/` — Frontend en Next.js.
- Raíz (`SULLU/`) — solo herramientas de repo (Husky + lint-staged para el pre-commit lint del backend), no es parte de la app.

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

## Backend

Ver `Backend/README.md` para comandos específicos (`npm run start:dev`, `npm run lint`, etc.).
