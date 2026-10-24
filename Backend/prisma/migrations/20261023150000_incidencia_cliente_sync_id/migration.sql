-- AlterTable
ALTER TABLE "incidencia_ingreso" ADD COLUMN IF NOT EXISTS "cliente_sync_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "incidencia_ingreso_cliente_sync_id_key" ON "incidencia_ingreso"("cliente_sync_id");
