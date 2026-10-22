-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "debe_configurar_perfil" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN IF NOT EXISTS "qr_version" INTEGER NOT NULL DEFAULT 1;

