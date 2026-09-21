# Guía de Integración y Verificación con Backend: HU 5 (Login y Autenticación)

Este documento detalla el estado de la implementación de la **Historia de Usuario 5 (Home > Login > Iniciar sesión)** en el Frontend, especificando qué partes están implementadas, qué flujos cuentan con simulación/fallback (mock) para el Sprint, y los contratos exactos requeridos para el equipo de Backend.

Adicionalmente, se incluyen **recomendaciones técnicas para el modelo relacional y la cascada de alcances/roles** solicitadas por el equipo.

---

## 1. Matriz de Criterios de Aceptación (Frontend vs Backend)

| Criterio / Escenario | Implementación Frontend | Estado en Backend | Acción requerida en Backend |
| :--- | :--- | :--- | :--- |
| **Inicio de sesión exitoso y redirección por rol** | Implementado en `LoginForm.tsx` y `useLogin.ts`. Redirige dinámicamente según permisos (`usuarios.ver`, `examenes.ver`, etc.). | Implementado básico (`POST /auth/login`). | Asegurar que el payload JWT y el objeto `usuario` siempre incluyan el array `permisos: string[]`. |
| **Credenciales incorrectas (Mensaje neutro)** | Implementado. Muestra: *"Correo o contraseña incorrectos. Por favor verifique sus datos."* sin revelar cuál dato falló. | Implementado (`401 UnauthorizedException('Credenciales inválidas')`). | Verificar que no varíe el mensaje entre correo inexistente o contraseña incorrecta para evitar enumeración. |
| **Campos obligatorios vacíos** | Implementado con Zod y React Hook Form. Bloquea el envío y resalta campos faltantes con feedback visual y `aria-invalid`. | Implementado en DTO (`@IsNotEmpty()`). | Ninguna adicional. |
| **Usuario inactivo / dado de baja (`deletedAt != null`)** | Implementado. Muestra mensaje explícito: *"El usuario no está habilitado para acceder al sistema."* | **Pendiente / Mockeado en Front**. | Modificar `AuthService.validateUser()`: Si `usuario.deletedAt !== null`, lanzar `HttpException('El usuario no está habilitado', HttpStatus.FORBIDDEN)`. |
| **Control de concurrencia (Sesión en otro dispositivo)** | Implementado. Muestra modal: *"Ya tienes una sesión abierta en otro dispositivo. ¿Deseas cerrarla e ingresar aquí?"*. Maneja **Cancelar** (no inicia) y **Aceptar** (invalida previa e inicia). | **Pendiente / Mockeado en Front**. | Implementar tracking de sesiones activas (ej. token en Redis o columna `sesion_activa_id` / `ultimo_token` en BD) y endpoints para validación/reemplazo. |
| **Recuperación de contraseña ("¿Olvidaste tu contraseña?")** | Implementado en `ForgotPasswordDialog.tsx`. Muestra mensaje neutro: *"Si el correo está registrado, recibirás un mensaje con las instrucciones..."* | **Pendiente / Mockeado en Front**. | Implementar endpoint `POST /auth/recuperar-password` que genere un token con expiración y envíe el correo institucional. |
| **Bloqueo de acceso fuera del rol (Rutas directas)** | Implementado en `src/middleware.ts` y pantalla 403 amigable en `src/app/unauthorized/page.tsx`. | Implementado en Guards (`RolesGuard` / `PermissionsGuard`). | Proteger todos los endpoints del backend con `@UseGuards(JwtAuthGuard, PermissionsGuard)`. |
| **Bitácora de auditoría de autenticación** | Implementado servicio `logAuditAuthEvent` que envía payload al backend y registra trazabilidad en consola como fallback. | **Pendiente / Mockeado en Front**. | Implementar `POST /auditoria/registro` o registrar directamente en `bitacora_auditoria` desde `AuthService.login()` y en fallos de autenticación. |

---

## 2. Contratos de Endpoints Requeridos para Backend

### 2.1. Detección de Cuenta Inactiva en `POST /auth/login`
Cuando el usuario existe pero tiene fecha de baja (`deletedAt !== null`):
```json
// HTTP 403 Forbidden
{
  "statusCode": 403,
  "error": "ACCOUNT_INACTIVE",
  "message": "El usuario no está habilitado para acceder al sistema"
}
```

### 2.2. Control de Concurrencia de Sesiones
Para validar si el usuario ya cuenta con un dispositivo conectado:
- **Opción A (Recomendada): Bandera en `POST /auth/login`**:
  - Request: `{ "email": "docente@umss.edu", "password": "...", "forzarCierrePrevio": false }`
  - Si tiene sesión activa y `forzarCierrePrevio === false`:
    ```json
    // HTTP 409 Conflict
    {
      "statusCode": 409,
      "error": "SESSION_CONFLICT",
      "sesionActiva": true,
      "dispositivo": "Navegador Chrome en Windows (IP 190.181.25.10)",
      "fechaHora": "14:15:00"
    }
    ```
  - Si el usuario presiona "Aceptar e ingresar", el frontend reenvía con `"forzarCierrePrevio": true`, el backend invalida el token previo y emite el nuevo login exitoso.

- **Opción B (Endpoint de verificación previa)**:
  - `POST /auth/verificar-sesion` con body `{ "email": "..." }` -> retorna `{ "sesionActiva": boolean }`.
  - `POST /auth/cerrar-sesion-previa` con body `{ "email": "...", "forzarCierre": true }`.

### 2.3. Recuperación de Contraseña
- **Endpoint**: `POST /auth/recuperar-password`
- **Request Body**:
  ```json
  {
    "email": "usuario@est.umss.edu"
  }
  ```
- **Response**: Siempre debe responder HTTP 200 con mensaje genérico:
  ```json
  {
    "success": true,
    "message": "Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña."
  }
  ```
  *(Seguridad: Nunca indicar si el correo fue encontrado o no).*

### 2.4. Bitácora de Auditoría
- **Tabla afectada**: `bitacora_auditoria`
- **Campos a registrar en cada intento**:
  - `usuarioId`: ID del usuario si se identificó, o `NULL` si no existe.
  - `accion`: `'LOGIN_EXITOSO'`, `'LOGIN_FALLIDO'`, `'SESION_CONCURRENTE_REEMPLAZADA'`, `'RECUPERACION_PASSWORD'`.
  - `modulo`: `'AUTH'`.
  - `ipOrigen`: IP del cliente request.
  - `fechaHora`: `CURRENT_TIMESTAMP`.
  - `detallesNuevo`: JSON con userAgent, correo ingresado y motivo del fallo (si aplica).

---

## 3. Cuentas de Prueba Configuradas en el Frontend (Mock Fallback)

Mientras el backend no tenga levantada la base de datos o estos endpoints, se pueden probar todos los escenarios con las siguientes credenciales:

| Perfil / Caso de Prueba | Correo | Contraseña | Comportamiento esperado |
| :--- | :--- | :--- | :--- |
| **Administrador General** | `admin@exacontrol.com` | `admin123` | Login exitoso, redirección a `/usuarios` o `/roles`. Acceso total. |
| **Docente (Exámenes)** | `docente@umss.edu` | `docente123` | Login exitoso, redirección a `/examenes`. Si intenta entrar a `/usuarios` por URL directa, el middleware bloquea y redirige a `/unauthorized`. |
| **Personal de Control** | `control@umss.edu` | `control123` | Login exitoso, redirección a `/estudiantes`. |
| **Usuario Inactivo (Baja)** | `inactivo@umss.edu` | `inactivo123` | Acceso rechazado con mensaje: *"El usuario no está habilitado para acceder al sistema."* |
| **Sesión Concurrente** | `concurrente@umss.edu` | `password123` | Se dispara el modal: *"Ya tienes una sesión abierta en otro dispositivo..."*. Probar "Cancelar" (mantiene form) y "Aceptar" (invalida e ingresa). |
| **Credenciales Inválidas** | Cualquier otro correo | Cualquier clave | Error genérico: *"Correo o contraseña incorrectos. Por favor verifique sus datos."* |

---

## 4. Recomendaciones Arquitectónicas para la Base de Datos y la Cascada de Alcances / Roles

En base a la consulta sobre cómo estructurar la creación de roles dinámicos y la cascada de permisos (por ejemplo: Administrador crea cualquier rol, Docente solo puede crear roles de personal de control o con menor jerarquía):

### A. Campo de Nivel Jerárquico en la tabla `Rol`
Actualmente la tabla `Rol` tiene:
```prisma
model Rol {
  id          Int     @id @default(autoincrement())
  nombre      String  @unique
  descripcion String?
  esPlantilla Boolean @default(false)
  deletedAt   DateTime?
}
```
**Sugerencia**: Agregar un campo `nivel`:
```prisma
  nivel       Int     @default(10) // 1 = SuperAdmin/Admin, 5 = Docente, 10 = Personal de Control / Estudiante
```
**Regla de negocio en Backend**:
> Un usuario solo puede crear o asignar roles cuyo `nivel` sea **estrictamente mayor** al menor nivel de sus propios roles (`rolNuevo.nivel > usuarioCreador.rol.nivel`).

### B. Principio de "Subconjunto de Permisos" (Subset Inheritance)
Para evitar que un Docente cree un rol con permisos de Administrador (`usuarios.eliminar` o `roles.crear`), el backend debe validar en el servicio `RolesService.create()`:
```ts
// Pseudocódigo de validación en NestJS:
const permisosCreador = await this.obtenerPermisosUsuario(creadorId);
const permisosSolicitados = createRolDto.permisosIds;

const esSubconjunto = permisosSolicitados.every(id => permisosCreador.includes(id));
if (!esSubconjunto) {
  throw new ForbiddenException('No puedes otorgar permisos que tú mismo no posees');
}
```

### C. Codependencia de Permisos en la Creación de Roles
Tal como indicaron:
- Para poder seleccionar `estudiantes.crear`, `estudiantes.habilitar`, etc., **debe ser obligatorio tener seleccionado el permiso base `estudiantes.ver`**.
- En la base de datos se puede agregar un campo auto-referencial en `Permiso`:
  ```prisma
  model Permiso {
    id            Int       @id @default(autoincrement())
    moduloId      Int
    clave         String    @unique
    descripcion   String?
    permisoPadreId Int?     // <-- Clave foránea a Permiso.id (si es nulo, es el permiso de visualización base)
    
    permisoPadre  Permiso?  @relation("DependenciaPermisos", fields: [permisoPadreId], references: [id])
    subPermisos   Permiso[] @relation("DependenciaPermisos")
  }
  ```
- De esta manera, si un usuario desmarca el permiso padre en el frontend, automáticamente se deshabilitan o desmarcan los permisos hijos.

### D. Alcance Territorial / Jurisdicción (`Usuario_Alcance`)
La tabla `Usuario_Alcance` pensada por el equipo:
`Usuario_Alcance { id, id_usuario, id_facultad, id_carrera, id_materia }`
es **correcta y suficiente** para la jurisdicción dinámica:
- Un Administrador de Facultad tiene `id_facultad = 1`, `id_carrera = NULL`, `id_materia = NULL`.
- Un Jefe de Carrera tiene `id_facultad = 1`, `id_carrera = 2`, `id_materia = NULL`.
- Un Docente tiene asignaciones específicas por materia: `id_facultad = 1`, `id_carrera = 2`, `id_materia = 5`.
Al consultar exámenes, estudiantes o ambientes, el backend solo debe filtrar:
`WHERE id_facultad IN (alcances) OR id_carrera IN (alcances) OR id_materia IN (alcances)`.
