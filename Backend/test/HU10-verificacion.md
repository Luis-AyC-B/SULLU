# Integración HU10 / HU15

Rama: `hu10-be`. Frontend oficial: `origin/hu10-fe`, commit `96c94dc`. Sin cambios de esquema, migraciones, seed ni credenciales.

## Contratos HTTP

Todas las rutas requieren JWT. El usuario responsable se obtiene de la sesión. El body nunca acepta `docenteId`, `usuarioId`, facultad ni rol.

| Método y ruta | Permiso | Entrada | Respuesta |
| --- | --- | --- | --- |
| GET /ambientes | ambientes.ver | Ninguna | Ambiente[] |
| GET /ambientes/:id | ambientes.ver | ID positivo | Ambiente |
| GET /ambientes/:id/disponibilidad | ambientes.ver | Query fecha YYYY-MM-DD | Periodo[] |
| PATCH /ambientes/:id/estado | ambientes.editar | { estado } | Ambiente |
| POST /reservas | ambientes.registrar_reserva | { ambienteId, horarioFijoId, fecha } | 201 Reserva |
| GET /reservas/mis-reservas | ambientes.ver | Ninguna | Reserva[] activas propias |
| PATCH /reservas/:id/cancelar | ambientes.cancelar_reserva | ID propio | 204 sin body |

Ambiente: `{ id, nombre, capacidad, facultadId?, facultad, tipoAulaId?, tipoAula, estado }`. Facultad y tipo son textos; estado es `HABILITADO`, `EN_REMODELACION` o `INHABILITADO`. Internamente HABILITADO se persiste como `DISPONIBLE`; MANTENIMIENTO y RESERVADO globales se presentan como INHABILITADO y no admiten reservas.

Periodo: `{ id, periodoNombre, horaIni, horaFin, estado }`, con horas HH:mm y estado `LIBRE | RESERVADO`. Sin datos privados del docente. Los periodos vienen de HorarioFijo; `diaSemana = null` aplica cualquier día y los nombres de día admiten tildes y mayúsculas.

Reserva: `{ id, ambienteId, ambienteNombre, facultad, fecha, horarioFijoId, periodoNombre, horaIni, horaFin, estado, examenAsociado, tieneExamenAsignado }`. Un examen no cancelado se considera asociado y bloquea cancelación; esto incluye exámenes finalizados. El registro cancelado permanece en la base, pero se excluye del listado activo que muestra la interfaz.

`ambienteNombre` y `periodoNombre` opcionales se admiten en el DTO de creación por compatibilidad, pero no se usan para persistencia. El servicio frontend envía exclusivamente los tres campos necesarios.

Errores: 400 para DTO/fecha/ID inválidos; 401 para JWT inválido o usuario inactivo; 403 para permiso o módulo inactivo; 404 para ambiente fuera de alcance o reserva ajena/inexistente; 409 para ambiente inhabilitado, periodo ocupado, cambio de estado con reservas vigentes o cancelación con examen vigente. La fecha se valida desde hoy en Bolivia hasta un mes calendario adelante inclusive, ajustado al último día del mes destino.

## Consistencia y Exámenes

Creación y cancelación de reserva, cambio de estado del ambiente y asociación de examen toman `SELECT ... FOR UPDATE` sobre la misma fila de `ambientes`. La disponibilidad se vuelve a consultar dentro de la transacción después del bloqueo. Las reservas usan aislamiento READ COMMITTED explícito para observar la confirmación de la solicitud anterior. No requiere migraciones. Esta coordinación cubre las rutas de la aplicación; escrituras SQL externas que omitan el protocolo no están protegidas por una restricción temporal en la base.

El selector de Exámenes usa `GET /examenes/mis-ambientes`, con `docenteId`, estado RESERVADO, ambiente habilitado y sin examen asociado. El frontend envía el ID elegido como `reservaAmbienteId`. La asociación se revalida dentro de la transacción y respeta la restricción única existente. Cancelar/eliminar un examen conserva su reserva y no libera automáticamente el periodo. Un examen cancelado que sigue persistido continúa ocupando la asociación única de esa reserva, aunque permite cancelarla.

Para inhabilitar o remodelar un ambiente no debe tener reservas RESERVADO desde la fecha de hoy. Las acciones requieren sus permisos reales; no se infiere administración ni alcance del correo. La estrategia JWT también rechaza usuarios dados de baja.

Exámenes reutiliza ahora PrismaService por inyección para usar la infraestructura del proyecto y permitir pruebas sin conexiones reales.

## Frontend

Se conservan componentes, markup visual, estilos y responsive de la compañera. Se sustituyeron los servicios simulados, se retiró el filtro por correo, se ajustaron permisos y fechas, se añadieron errores con el Toaster existente y se evita navegar al listado si falla una reserva. Las respuestas antiguas de disponibilidad se cancelan/descartan; reservar, cancelar y reabrir el modal actualizan su consulta.

La comparación estática de className en los 16 archivos visuales coincide con el commit oficial. Esto no equivale a una validación visual en navegador.

Respaldo previo conservado en `C:/Users/Usuario/AppData/Local/Temp/SULLU-integracion-20261011-212534`, sin .env. Incluye manifiesto de los cambios previos y archivos propios retirados.

## Comandos de validación

Desde Backend:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
.\node_modules\.bin\jest.cmd --runInBand ambientes.service.spec.ts reservas.service.spec.ts examenes-reservas.spec.ts
.\node_modules\.bin\jest.cmd --config test/jest-e2e.json --runInBand ambientes.e2e-spec.ts reservas.e2e-spec.ts
```

Desde Frontend:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
.\node_modules\.bin\eslint.cmd src/features/ambientes "src/app/(dashboard)/ambientes/page.tsx" src/middleware.ts
```

Resultados: TypeScript backend/frontend aprobado; 46 pruebas unitarias aprobadas; 20 pruebas HTTP aprobadas; lint del frontend y lint del código de producción de Ambientes/Reservas aprobado. Las pruebas usan persistencia sustituida, incluidas la simulación de serialización y las pruebas de Exámenes. No verifican firmas JWT reales ni bloqueos con conexiones PostgreSQL independientes. El usuario indicó que por ahora se valide solo con pruebas aisladas; no se conectó ni modificó PostgreSQL.

El lint tipado detectó declaraciones .d.ts ausentes de la instalación local de Swagger. Se recuperaron 126 declaraciones desde el paquete oficial @nestjs/swagger 11.4.7, la misma versión instalada, exclusivamente en node_modules. No se cambiaron versiones, manifests ni lockfiles. TypeScript y lint del backend pasaron después de la reparación.

## Prueba funcional posterior

Con los servidores habituales y PostgreSQL ya configurados, sin seed ni migraciones:

1. Iniciar sesión y abrir /ambientes. Comparar administrador con usuario de alcance limitado.
2. Buscar variando tildes/mayúsculas y verificar estados, errores y reintento.
3. Consultar fechas límite y verificar los horarios institucionales y reservas existentes.
4. Reservar un periodo libre y comprobar Mis reservas. Una reserva rechazada debe mantener el diálogo y mostrar el error.
5. Cancelar una reserva sin examen y volver a consultar disponibilidad: el periodo debe quedar libre.
6. Asociar una reserva a un examen y verificar que se bloquea la cancelación de reserva. Cancelar el examen debe mantener la reserva.
7. Intentar editar estado con reservas vigentes: 409. Verificar los permisos sin confiar en botones del navegador.
8. Con una base aislada autorizada, lanzar dos solicitudes simultáneas al mismo ambiente/periodo y comprobar exactamente una reserva y un 409. Probar también cancelación frente a asociación de examen y edición de estado frente a creación.
9. Verificar a 375 px y 1280 px, calendario y modales, sin modificar el diseño oficial.
