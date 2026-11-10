-- ============================================================
-- Migración: sprint3-hu17-hu18-hu20
-- HU17: índice en ingresos para reporte
-- HU18: enum TipoIncidencia + registradoPor opcional + índice incidencias
-- HU20: columna casoExcepcional + unique + índice en ingresos
-- ============================================================

-- HU20: nueva columna caso_excepcional en ingresos
ALTER TABLE "ingresos" ADD COLUMN "caso_excepcional" VARCHAR(50);

-- HU20: restricción única (un ingreso por estudiante por examen)
-- IMPORTANTE: asegurarse de que no haya duplicados antes de aplicar
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_estudiante_id_examen_id_key" UNIQUE ("estudiante_id", "examen_id");

-- HU17: índice para acelerar listado y PDF por examen
CREATE INDEX "ingresos_examen_id_fecha_hora_idx" ON "ingresos"("examen_id", "fecha_hora");

-- HU18: nuevos valores del enum TipoIncidencia
ALTER TYPE "TipoIncidencia" ADD VALUE IF NOT EXISTS 'QR_OTRO_EXAMEN';
ALTER TYPE "TipoIncidencia" ADD VALUE IF NOT EXISTS 'QR_NO_VALIDO';
ALTER TYPE "TipoIncidencia" ADD VALUE IF NOT EXISTS 'NO_LLEGO';

-- HU18: registrado_por ahora es opcional (permite NULL para incidencias generadas por el sistema)
ALTER TABLE "incidencia_ingreso" ALTER COLUMN "registrado_por" DROP NOT NULL;

-- HU18: índice para filtro por motivo y PDF
CREATE INDEX "incidencia_ingreso_examen_id_tipo_incidencia_fecha_hora_idx" ON "incidencia_ingreso"("id_examen", "tipo_incidencia", "fecha_hora");