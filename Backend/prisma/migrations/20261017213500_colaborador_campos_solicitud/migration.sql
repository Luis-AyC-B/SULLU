-- AlterTable
ALTER TABLE "docente_colaborador" ALTER COLUMN "id_colaborador" DROP NOT NULL;

-- AlterTable
ALTER TABLE "docente_colaborador" ADD COLUMN "nombres_solicitados" TEXT;
ALTER TABLE "docente_colaborador" ADD COLUMN "apellidos_solicitados" TEXT;
