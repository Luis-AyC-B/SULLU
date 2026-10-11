/*
  Warnings:

  - You are about to drop the column `id_estadoAula` on the `ambientes` table. All the data in the column will be lost.
  - You are about to drop the column `estadoAula` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `hora_fin` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `hora_ini` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `id_ambiente` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `id_estadoAula` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `id_usuario` on the `reserva_ambiente` table. All the data in the column will be lost.
  - You are about to drop the column `motivo` on the `reserva_ambiente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[usuario_id]` on the table `estudiantes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_reservaAmbiente]` on the table `examenes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cliente_sync_id]` on the table `ingresos` will be added. If there are existing duplicate values, this will fail.
  - Made the column `estadoAula` on table `ambientes` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `ambiente_id` to the `reserva_ambiente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `docente_id` to the `reserva_ambiente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horario_fijo_id` to the `reserva_ambiente` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('RESERVADO', 'CANCELADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('NO_HABILITADO', 'NO_ENCONTRADO', 'QR_CADUCADO', 'DOBLE_MARCACION', 'IDENTIDAD_NO_COINCIDE');

-- AlterEnum
ALTER TYPE "EstadoAula" ADD VALUE 'EN_REMODELACION';

-- DropForeignKey
ALTER TABLE "reserva_ambiente" DROP CONSTRAINT "reserva_ambiente_id_ambiente_fkey";

-- DropForeignKey
ALTER TABLE "reserva_ambiente" DROP CONSTRAINT "reserva_ambiente_id_usuario_fkey";

-- AlterTable
ALTER TABLE "ambientes" DROP COLUMN "id_estadoAula",
ALTER COLUMN "estadoAula" SET NOT NULL,
ALTER COLUMN "estadoAula" SET DEFAULT 'DISPONIBLE';

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "ingresos" ADD COLUMN     "cliente_sync_id" TEXT,
ADD COLUMN     "es_offline" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reserva_ambiente" DROP COLUMN "estadoAula",
DROP COLUMN "hora_fin",
DROP COLUMN "hora_ini",
DROP COLUMN "id_ambiente",
DROP COLUMN "id_estadoAula",
DROP COLUMN "id_usuario",
DROP COLUMN "motivo",
ADD COLUMN     "ambiente_id" INTEGER NOT NULL,
ADD COLUMN     "docente_id" INTEGER NOT NULL,
ADD COLUMN     "estado" "EstadoReserva" NOT NULL DEFAULT 'RESERVADO',
ADD COLUMN     "horario_fijo_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "horario_fijo" (
    "id" SERIAL NOT NULL,
    "periodo_nombre" TEXT NOT NULL,
    "dia_semana" TEXT,
    "hora_ini" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,

    CONSTRAINT "horario_fijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docente_colaborador" (
    "id" SERIAL NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "id_colaborador" INTEGER NOT NULL,
    "estado_solicitud" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por" INTEGER,
    "fecha_solicitud" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP,
    "correo_solicitado" TEXT,

    CONSTRAINT "docente_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examen_controlador" (
    "id" SERIAL NOT NULL,
    "id_examen" INTEGER NOT NULL,
    "id_colaborador" INTEGER NOT NULL,
    "asignado_por" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rol_asignacion" TEXT NOT NULL DEFAULT 'Control principal',

    CONSTRAINT "examen_controlador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia_ingreso" (
    "id" SERIAL NOT NULL,
    "id_examen" INTEGER NOT NULL,
    "registrado_por" INTEGER NOT NULL,
    "id_estudiante" INTEGER,
    "cod_sis_ingresado" TEXT,
    "ci_ingresado" TEXT,
    "nombre_referencial" TEXT,
    "tipo_incidencia" "TipoIncidencia" NOT NULL,
    "descripcion" TEXT,
    "fecha_hora" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencia_ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "examen_controlador_id_examen_id_colaborador_key" ON "examen_controlador"("id_examen", "id_colaborador");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_usuario_id_key" ON "estudiantes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "examenes_id_reservaAmbiente_key" ON "examenes"("id_reservaAmbiente");

-- CreateIndex
CREATE UNIQUE INDEX "ingresos_cliente_sync_id_key" ON "ingresos"("cliente_sync_id");

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_horario_fijo_id_fkey" FOREIGN KEY ("horario_fijo_id") REFERENCES "horario_fijo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_colaborador" ADD CONSTRAINT "docente_colaborador_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_colaborador" ADD CONSTRAINT "docente_colaborador_id_colaborador_fkey" FOREIGN KEY ("id_colaborador") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_colaborador" ADD CONSTRAINT "docente_colaborador_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_controlador" ADD CONSTRAINT "examen_controlador_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_controlador" ADD CONSTRAINT "examen_controlador_id_colaborador_fkey" FOREIGN KEY ("id_colaborador") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_controlador" ADD CONSTRAINT "examen_controlador_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_ingreso" ADD CONSTRAINT "incidencia_ingreso_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_ingreso" ADD CONSTRAINT "incidencia_ingreso_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_ingreso" ADD CONSTRAINT "incidencia_ingreso_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "estudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
