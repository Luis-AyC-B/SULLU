ALTER TABLE "codigos_qr" DROP CONSTRAINT IF EXISTS "codigos_qr_examen_id_fkey";
DROP INDEX IF EXISTS "codigos_qr_estudiante_id_examen_id_tipo_idx";
ALTER TABLE "codigos_qr" DROP COLUMN IF EXISTS "examen_id";
ALTER TABLE "codigos_qr" DROP COLUMN IF EXISTS "tipo";