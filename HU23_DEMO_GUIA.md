# HU23 con el frontend original de origin/hu23-fe

Los siete archivos traídos por el usuario coincidían con `origin/hu23-fe` antes de integrar. Se mantienen el diseño, clases y estructura del modal de la compañera; ExamCard y las utilidades de fechas/offline no se sustituyen. El checkout actual no contenía el backend demo anterior: se recuperó el adaptador stdin y se conservaron los ONNX y entornos Python existentes.

## Inicio en Windows 10 / Git Bash

Terminal backend:
```bash
cd /c/Users/luisc/Desktop/sullu/Backend
HU23_DEMO_MODE=true npm run start:demo:hu23
```
Terminal frontend:
```bash
cd /c/Users/luisc/Desktop/sullu/Frontend
HU23_DEMO_MODE=true npm run dev
```
Entra por **http://localhost:4000/login**. No existe una página demo alternativa.

| Cuenta | Contraseña | Pantalla |
|---|---|---|
| `estudiante@hu23.local` | `Hu23Demo!26` | `/portal` |
| `control@hu23.local` | `Hu23Demo!26` | `/control-ingreso` |

Se requiere el flag en ambos procesos y acceso desde localhost. Las cuentas se rechazan en producción; las credenciales reales conservan su camino habitual. No cambies `.env`, URLs normales, Prisma, migraciones ni seeds.

## Presentación: 3–5 minutos

1. **0:00–1:00.** Login estudiante. Mostrar las tarjetas originales. Pulsar **Registrar fotografía de referencia**: se abre el mismo modal de hu23-fe. Permitir cámara y capturar una foto propia, con un solo rostro. Queda como referencia en memoria.
2. **1:00–2:00.** Pulsar **Generar QR** en un examen y capturar OTRA selfie. El modal muestra la comparación y, si SFace supera el umbral, el QR. La selfie se descarta incluso al fallar.
3. **2:00–3:00.** Usar **Descargar PNG** (demo descarga solo el QR). Cerrar sesión desde el menú original y entrar como control. Seleccionar el mismo examen, pulsar **Iniciar** y abrir el escáner original. Escanear desde otra pantalla o usar su opción existente **Subir imagen QR** con el PNG.
4. **3:00–3:45.** Ver nombre, SIS, examen, ambiente y foto ORIGINAL. Pulsar **Confirmar ingreso**. Solo entonces se registra en RAM y se consume el token. Repetir el QR debe rechazarse.
5. **3:45–5:00.** Volver como estudiante sin reemplazar la referencia. Otra persona autorizada intenta generar QR, o se captura una pared/dos personas: debe rechazarse. Explicar límites y ausencia de PostgreSQL.

La referencia permanece al cambiar de cuenta para que el operador la vea. Reemplazarla revoca los QR anteriores. Reiniciar el backend borra toda la demo. La cámara necesita localhost o HTTPS; si se deniega permiso, habilitarlo en el navegador. No se admite galería para la selfie demo.

## Real, simulado y privacidad

**Real:** YuNet detecta exactamente un rostro, SFace alinea y extrae características, comparación coseno, firma/verificación JWT con `QrTokenService` existente, expiración y consumo. No hay respuesta fija de coincidencia. No es prueba de vida.

**Simulado:** un estudiante, dos exámenes, un operador, habilitaciones y persistencia en RAM. El arranque aislado no importa AppModule ni inicializa Prisma. Solo las sesiones demo se dirigen al puerto 3003. No hay nuevos layouts, tarjetas o modales; se amplía QrSuccessCard para la confirmación solicitada.

La selfie recorre cámara → Blob → multipart en memoria → Python stdin → descarte; nunca se escribe en BD, disco, temporales, logs, QR, LocalStorage o IndexedDB. La referencia se guarda en RAM y se transmite solo para visualizarla. No exportes HAR ni actives logs de cuerpos. El generador QR usa un repositorio en memoria y una clave aleatoria por arranque, distinta de la real. Las sesiones expiran tras una hora inactivas; la referencia permanece hasta reemplazo o reinicio.

Variables opcionales backend: `HU23_PYTHON` (ruta absoluta al Python existente), `HU23_FACE_THRESHOLD` (0.45; rango permitido 0.3–1). Para usar una referencia LOCAL AUTORIZADA al arrancar: `HU23_REFERENCE_IMAGE='C:/ruta/autorizada/referencia.jpg' HU23_DEMO_MODE=true npm run start:demo:hu23`. Si no se indica, regístrala con tu cámara. No se incluyen fotografías de personas ni se usan fixtures sin autorización.

Python por defecto: `Backend/.venv-hu23/Scripts/python.exe`, comprobado con Python 3.11.9/OpenCV 4.10. Los ONNX locales son `scripts/models/face_detection_yunet_2023mar.onnx` y `face_recognition_sface_2021dec.onnx`. No se descargaron modelos ni dependencias. Al clonar en otro equipo hay que disponer de ellos. Node disponible: 24.15.0; package.json declara 20.19.x.

## Pruebas y limitaciones

Desde Backend, con la demo iniciada:
```bash
npx tsc --noEmit --incremental false
npm test -- --runInBand --runTestsByPath src/demo-hu23/main.spec.ts
.venv-hu23/Scripts/python.exe -B scripts/test_hu23_demo.py
```
Desde Frontend:
```bash
npm test -- --runInBand --runTestsByPath src/features/portal/__tests__/ExamQrModalBloque3.test.tsx src/features/portal/__tests__/ExamQrServiceBloque1.test.ts
```
Las pruebas de negocio usan comparador controlado SOLO en Jest. El smoke prueba OpenCV real con imagen sintética SIN rostro, login, contratos, roles y QR inválido. No acredita reconocimiento entre personas. Por petición del usuario quedan PENDIENTES MANUALES: misma persona, persona diferente, múltiples rostros reales y escaneo de un QR emitido con una coincidencia real.

El TypeScript completo del frontend mantiene el error anterior en `ConfirmarIngreso.test.tsx:25`: `ingresados` no existe en `ExamenAsignado`. No se alteró ese archivo. No se certifica build de producción completo. El modo normal todavía requiere PostgreSQL actualizado y la futura integración HU23 con sus datos reales; esta demo no lo reemplaza. No están simulados registro manual, incidencias ni otros módulos. El backend demo escucha solo en 127.0.0.1:3003, con inferencia serial y timeout de 30 segundos. No expongas la demo públicamente.

Para volver al sistema normal: Ctrl+C en ambos procesos; si exportaste la variable, `unset HU23_DEMO_MODE`; iniciar con los comandos normales. Sin el flag y en producción las cuentas ficticias no son válidas. No se realizaron commits ni push.

## Resultado ejecutado y archivos

TypeScript backend y código de aplicación frontend: sin errores. Jest: 5 pruebas backend y 18 frontend aprobadas; los éxitos de negocio del backend usan un comparador controlado solo para probar reglas. Lint de archivos de integración comprobados: sin errores ni advertencias. Navegador: login de ambos roles, Portal con dos exámenes, cámara del modal de hu23-fe, rechazo real de captura sintética sin rostro y descarte de imagen; Control original y lectura/rechazo de QR inválido sin perder sesión. Estas pruebas no acreditan coincidencia entre personas ni un ingreso real: siguen pendientes con tu cámara.

Archivos añadidos:
- `Backend/scripts/hu23_facial_stdin.py`: motor real por stdin, sin archivos de selfie.
- `Backend/scripts/test_hu23_demo.py`: smoke HTTP sin fotografías de personas.
- `Backend/src/demo-hu23/main.ts`: arranque aislado, cuentas, contratos y repositorio QR en RAM.
- `Backend/src/demo-hu23/main.spec.ts`: pruebas de reglas, firma, expiración y confirmación.
- `Backend/src/portal-estudiante/facial/memory-comparador-facial.service.ts`: adaptador Python sin temporales.
- `Frontend/src/features/portal/api/hu23-demo.ts`: identificación de sesión y destino demo.
- `HU23_DEMO_GUIA.md`: instrucciones y guion.

Archivos modificados sobre el estado que entregaste:
- `Backend/package.json`: comando de arranque demo.
- `Frontend/src/shared/lib/auth.ts`: credenciales demo aisladas en NextAuth.
- `Frontend/src/shared/lib/api-client.ts`: transporte acotado a endpoints demo.
- `Frontend/src/shared/components/layout/header.tsx`: identificación de datos simulados.
- `Frontend/src/features/portal/api/exam-qr.service.ts`: contrato de errores y motor real incluso si existen mocks visuales.
- `Frontend/src/features/portal/hooks/useStudentExams.ts`: conserva contrato demo y omite caché demo.
- `Frontend/src/features/portal/components/StudentExamsView.tsx`: registro de referencia con el mismo modal.
- `Frontend/src/features/portal/components/ExamQrModal.tsx`: integración mínima, cámara y descarte, sin cambiar clases visuales.
- `Frontend/src/features/portal/components/StudentProfileModal.tsx`: acepta URL de referencia en memoria.
- `Frontend/src/features/portal/__tests__/ExamQrModalBloque3.test.tsx`: prueba de foto original y confirmación.
- `Frontend/src/features/control-ingreso/services/control-ingreso.service.ts`: validación demo sin fallback offline.
- `Frontend/src/features/control-ingreso/types/control-ingreso.types.ts`: foto/examen y confirmación pendiente.
- `Frontend/src/features/control-ingreso/components/escanear/EscanearQrModal.tsx`: confirma antes de consumir QR.
- `Frontend/src/features/control-ingreso/components/escanear/QrSuccessCard.tsx`: muestra referencia y acción de confirmar.

Los siete archivos recibidos se compararon con `origin/hu23-fe` antes de editar: coincidían. Los cambios grandes que muestra Git contra HEAD en esos archivos son principalmente el trabajo restaurado de tu compañera; el recuento de esta integración se calcula contra ese estado recibido.
