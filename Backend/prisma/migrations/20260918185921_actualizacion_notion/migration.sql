/*
  Warnings:

  - You are about to drop the column `carrera` on the `estudiantes` table. All the data in the column will be lost.
  - You are about to drop the column `codigo_universitario` on the `estudiantes` table. All the data in the column will be lost.
  - You are about to drop the column `ambiente_id` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `asignatura` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `docente_id` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `duracion_min` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `examenes` table. All the data in the column will be lost.
  - You are about to drop the column `permisos` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `rol_id` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `habilitaciones` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cod_sis]` on the table `estudiantes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cod_sis` to the `estudiantes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_EstadoExam` to the `examenes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_reservaAmbiente` to the `examenes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_usuario` to the `examenes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_examen` to the `examenes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "codigos_qr" DROP CONSTRAINT "codigos_qr_estudiante_id_fkey";

-- DropForeignKey
ALTER TABLE "estudiantes" DROP CONSTRAINT "estudiantes_carga_id_fkey";

-- DropForeignKey
ALTER TABLE "examenes" DROP CONSTRAINT "examenes_ambiente_id_fkey";

-- DropForeignKey
ALTER TABLE "examenes" DROP CONSTRAINT "examenes_docente_id_fkey";

-- DropForeignKey
ALTER TABLE "habilitaciones" DROP CONSTRAINT "habilitaciones_estudiante_id_fkey";

-- DropForeignKey
ALTER TABLE "habilitaciones" DROP CONSTRAINT "habilitaciones_examen_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_rol_id_fkey";

-- DropIndex
DROP INDEX "estudiantes_codigo_universitario_key";

-- AlterTable
ALTER TABLE "ambientes" ADD COLUMN     "id_estadoAula" INTEGER,
ADD COLUMN     "id_facultad" INTEGER,
ADD COLUMN     "id_tipoAula" INTEGER;

-- AlterTable
ALTER TABLE "estudiantes" DROP COLUMN "carrera",
DROP COLUMN "codigo_universitario",
ADD COLUMN     "apellido" TEXT,
ADD COLUMN     "cod_sis" TEXT NOT NULL,
ALTER COLUMN "ci" DROP NOT NULL,
ALTER COLUMN "carga_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "examenes" DROP COLUMN "ambiente_id",
DROP COLUMN "asignatura",
DROP COLUMN "docente_id",
DROP COLUMN "duracion_min",
DROP COLUMN "fecha",
DROP COLUMN "hora",
ADD COLUMN     "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id_EstadoExam" INTEGER NOT NULL,
ADD COLUMN     "id_reservaAmbiente" INTEGER NOT NULL,
ADD COLUMN     "id_usuario" INTEGER NOT NULL,
ADD COLUMN     "normas_ex" TEXT,
ADD COLUMN     "tipo_examen" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "permisos",
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "es_plantilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "rol_id",
ADD COLUMN     "apellido" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP,
ADD COLUMN     "telefono" TEXT;

-- DropTable
DROP TABLE "habilitaciones";

-- CreateTable
CREATE TABLE "modulos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "modulo_id" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "usuario_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("usuario_id","rol_id")
);

-- CreateTable
CREATE TABLE "rol_modulo" (
    "rol_id" INTEGER NOT NULL,
    "modulo_id" INTEGER NOT NULL,

    CONSTRAINT "rol_modulo_pkey" PRIMARY KEY ("rol_id","modulo_id")
);

-- CreateTable
CREATE TABLE "facultades" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "facultades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carreras" (
    "id" SERIAL NOT NULL,
    "id_facultad" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "carreras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" SERIAL NOT NULL,
    "sigla" TEXT,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrera_materia" (
    "id_carrera" INTEGER NOT NULL,
    "id_materia" INTEGER NOT NULL,

    CONSTRAINT "carrera_materia_pkey" PRIMARY KEY ("id_carrera","id_materia")
);

-- CreateTable
CREATE TABLE "usuario_alcance" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_facultad" INTEGER,
    "id_carrera" INTEGER,
    "id_materia" INTEGER,

    CONSTRAINT "usuario_alcance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_aula" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipo_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_aula" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "estado_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_ambiente" (
    "id" SERIAL NOT NULL,
    "id_ambiente" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_ini" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "motivo" TEXT,
    "id_estadoAula" INTEGER,

    CONSTRAINT "reserva_ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_examen" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "estado_examen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examen_carrera_materia" (
    "id_examen" INTEGER NOT NULL,
    "id_carrera" INTEGER NOT NULL,
    "id_materia" INTEGER NOT NULL,

    CONSTRAINT "examen_carrera_materia_pkey" PRIMARY KEY ("id_examen","id_carrera","id_materia")
);

-- CreateTable
CREATE TABLE "examen_estudiante" (
    "id_estudiante" INTEGER NOT NULL,
    "id_examen" INTEGER NOT NULL,
    "estado_habilitado" BOOLEAN NOT NULL DEFAULT true,
    "motivo_inhabilitacion" TEXT,

    CONSTRAINT "examen_estudiante_pkey" PRIMARY KEY ("id_estudiante","id_examen")
);

-- CreateTable
CREATE TABLE "bitacora_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(50) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "tabla_afectada" VARCHAR(50),
    "registro_id" INTEGER,
    "detalles_anterior" JSONB,
    "detalles_nuevo" JSONB,
    "ip_origen" VARCHAR(45),
    "fecha_hora" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modulos_nombre_key" ON "modulos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_clave_key" ON "permisos"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "facultades_nombre_key" ON "facultades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_cod_sis_key" ON "estudiantes"("cod_sis");

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_modulo" ADD CONSTRAINT "rol_modulo_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_modulo" ADD CONSTRAINT "rol_modulo_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carreras" ADD CONSTRAINT "carreras_id_facultad_fkey" FOREIGN KEY ("id_facultad") REFERENCES "facultades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrera_materia" ADD CONSTRAINT "carrera_materia_id_carrera_fkey" FOREIGN KEY ("id_carrera") REFERENCES "carreras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrera_materia" ADD CONSTRAINT "carrera_materia_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_alcance" ADD CONSTRAINT "usuario_alcance_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_alcance" ADD CONSTRAINT "usuario_alcance_id_facultad_fkey" FOREIGN KEY ("id_facultad") REFERENCES "facultades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_alcance" ADD CONSTRAINT "usuario_alcance_id_carrera_fkey" FOREIGN KEY ("id_carrera") REFERENCES "carreras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_alcance" ADD CONSTRAINT "usuario_alcance_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_id_facultad_fkey" FOREIGN KEY ("id_facultad") REFERENCES "facultades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_id_tipoAula_fkey" FOREIGN KEY ("id_tipoAula") REFERENCES "tipo_aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_id_estadoAula_fkey" FOREIGN KEY ("id_estadoAula") REFERENCES "estado_aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_id_ambiente_fkey" FOREIGN KEY ("id_ambiente") REFERENCES "ambientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_ambiente" ADD CONSTRAINT "reserva_ambiente_id_estadoAula_fkey" FOREIGN KEY ("id_estadoAula") REFERENCES "estado_aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examenes" ADD CONSTRAINT "examenes_id_reservaAmbiente_fkey" FOREIGN KEY ("id_reservaAmbiente") REFERENCES "reserva_ambiente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examenes" ADD CONSTRAINT "examenes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examenes" ADD CONSTRAINT "examenes_id_EstadoExam_fkey" FOREIGN KEY ("id_EstadoExam") REFERENCES "estado_examen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_carrera_materia" ADD CONSTRAINT "examen_carrera_materia_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_carrera_materia" ADD CONSTRAINT "examen_carrera_materia_id_carrera_id_materia_fkey" FOREIGN KEY ("id_carrera", "id_materia") REFERENCES "carrera_materia"("id_carrera", "id_materia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas_estudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_estudiante" ADD CONSTRAINT "examen_estudiante_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_estudiante" ADD CONSTRAINT "examen_estudiante_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_qr" ADD CONSTRAINT "codigos_qr_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora_auditoria" ADD CONSTRAINT "bitacora_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
