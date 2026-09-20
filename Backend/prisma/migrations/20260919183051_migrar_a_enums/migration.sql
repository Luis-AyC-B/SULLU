/*
  Warnings:

  - You are about to drop the `estado_aula` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `estado_examen` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoAula" AS ENUM ('DISPONIBLE', 'RESERVADO', 'MANTENIMIENTO', 'INHABILITADO');

-- CreateEnum
CREATE TYPE "EstadoExamen" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- DropForeignKey
ALTER TABLE "ambientes" DROP CONSTRAINT "ambientes_id_estadoAula_fkey";

-- DropForeignKey
ALTER TABLE "examenes" DROP CONSTRAINT "examenes_id_EstadoExam_fkey";

-- DropForeignKey
ALTER TABLE "reserva_ambiente" DROP CONSTRAINT "reserva_ambiente_id_estadoAula_fkey";

-- AlterTable
ALTER TABLE "ambientes" ADD COLUMN     "estadoAula" "EstadoAula";

-- AlterTable
ALTER TABLE "examenes" ADD COLUMN     "estado" "EstadoExamen" NOT NULL DEFAULT 'PROGRAMADO';

-- AlterTable
ALTER TABLE "reserva_ambiente" ADD COLUMN     "estadoAula" "EstadoAula";

-- DropTable
DROP TABLE "estado_aula";

-- DropTable
DROP TABLE "estado_examen";
