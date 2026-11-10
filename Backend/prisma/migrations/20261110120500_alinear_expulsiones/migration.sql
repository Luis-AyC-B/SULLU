BEGIN;

-- Alinear la tabla de HU19 con Prisma, conservando las expulsiones existentes.
DO $$
DECLARE
  nombre_anterior TEXT;
  nombre_actual TEXT;
BEGIN
  FOR nombre_anterior, nombre_actual IN
    SELECT * FROM (VALUES
      ('examenId', 'examen_id'),
      ('estudianteId', 'estudiante_id'),
      ('docenteId', 'docente_id'),
      ('fechaHora', 'fecha_hora')
    ) AS nombres(anterior, actual)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'expulsion'
        AND column_name = nombre_anterior
    ) THEN
      EXECUTE format('ALTER TABLE expulsion RENAME COLUMN %I TO %I',
        nombre_anterior, nombre_actual);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  CREATE TYPE caso_incidencia AS ENUM (
    'EXPULSION', 'SUPLANTACION_IDENTIDAD', 'AMONESTACION', 'PROBLEMA_MEDICO',
    'RETIRO_VOLUNTARIO', 'INCIDENCIA_TECNICA', 'OTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE expulsion
  ADD COLUMN IF NOT EXISTS caso caso_incidencia NOT NULL DEFAULT 'EXPULSION',
  ALTER COLUMN detalle SET DEFAULT '';

ALTER INDEX IF EXISTS "expulsion_examenId_fechaHora_idx"
  RENAME TO expulsion_examen_id_fecha_hora_idx;
ALTER INDEX IF EXISTS "expulsion_examenId_estudianteId_key"
  RENAME TO expulsion_examen_id_estudiante_id_key;

COMMIT;
