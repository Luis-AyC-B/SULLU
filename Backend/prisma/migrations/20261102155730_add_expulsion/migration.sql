-- CreateTable
CREATE TABLE "expulsion" (
    "id" SERIAL NOT NULL,
    "examenId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "motivo" VARCHAR(50) NOT NULL,
    "detalle" VARCHAR(500) NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expulsion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expulsion_examenId_fechaHora_idx" ON "expulsion"("examenId", "fechaHora" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "expulsion_examenId_estudianteId_key" ON "expulsion"("examenId", "estudianteId");

-- AddForeignKey
ALTER TABLE "expulsion" ADD CONSTRAINT "expulsion_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "examenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expulsion" ADD CONSTRAINT "expulsion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expulsion" ADD CONSTRAINT "expulsion_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
