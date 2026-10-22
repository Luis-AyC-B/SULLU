-- AlterTable
ALTER TABLE "codigos_qr" ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(50) NOT NULL DEFAULT 'personal';
ALTER TABLE "codigos_qr" ADD COLUMN IF NOT EXISTS "examen_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "codigos_qr_estudiante_id_examen_id_tipo_idx" ON "codigos_qr"("estudiante_id", "examen_id", "tipo");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'codigos_qr_examen_id_fkey'
  ) THEN
    ALTER TABLE "codigos_qr"
      ADD CONSTRAINT "codigos_qr_examen_id_fkey"
      FOREIGN KEY ("examen_id") REFERENCES "examenes"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;