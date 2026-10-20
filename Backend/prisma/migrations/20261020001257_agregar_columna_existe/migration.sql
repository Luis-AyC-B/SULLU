-- DropForeignKey
ALTER TABLE "docente_colaborador" DROP CONSTRAINT "docente_colaborador_id_colaborador_fkey";

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN     "foto_url" TEXT,
ADD COLUMN     "perfil_completo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "fotos_estudiante" (
    "id" SERIAL NOT NULL,
    "estudiante_id" INTEGER NOT NULL,
    "archivo" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "similitud" DOUBLE PRECISION,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fotos_estudiante_estudiante_id_estado_idx" ON "fotos_estudiante"("estudiante_id", "estado");

-- AddForeignKey
ALTER TABLE "fotos_estudiante" ADD CONSTRAINT "fotos_estudiante_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_colaborador" ADD CONSTRAINT "docente_colaborador_id_colaborador_fkey" FOREIGN KEY ("id_colaborador") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
