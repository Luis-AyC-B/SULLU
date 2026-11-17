BEGIN;

CREATE TABLE "ejecuciones_respaldo" (
  "fecha_hora" TIMESTAMPTZ(3) NOT NULL,
  "archivo" TEXT NOT NULL,
  "estado" TEXT NOT NULL CHECK ("estado" IN ('EXITOSO', 'FALLIDO')),
  "tamano_bytes" BIGINT CHECK ("tamano_bytes" >= 0),
  "restaurado_en_prueba" BOOLEAN NOT NULL,
  CONSTRAINT "ejecuciones_respaldo_pkey" PRIMARY KEY ("fecha_hora", "archivo")
);

CREATE TABLE "restauraciones_respaldo" (
  "id" SERIAL PRIMARY KEY,
  "fecha_respaldo" TIMESTAMPTZ(3) NOT NULL,
  "archivo" TEXT NOT NULL,
  "estado" TEXT NOT NULL CHECK ("estado" IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'FALLIDA')),
  "solicitado_por" INTEGER NOT NULL,
  "solicitada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "base_restaurada" TEXT,
  "error" TEXT,
  CONSTRAINT "restauraciones_respaldo_fecha_respaldo_archivo_key" UNIQUE ("fecha_respaldo", "archivo"),
  CONSTRAINT "restauraciones_respaldo_fecha_respaldo_archivo_fkey" FOREIGN KEY ("fecha_respaldo", "archivo")
    REFERENCES "ejecuciones_respaldo" ("fecha_hora", "archivo") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE public.programacion_respaldos (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  proximo_automatico TIMESTAMPTZ(3),
  latido TIMESTAMPTZ(3),
  ejecucion TEXT CHECK (ejecucion IN ('AUTOMATICA', 'MANUAL')),
  manual_pendiente BOOLEAN NOT NULL DEFAULT false,
  resultado_manual TEXT CHECK (resultado_manual IN ('EXITOSO', 'FALLIDO'))
);

INSERT INTO public.programacion_respaldos (id) VALUES (1);

COMMIT;
