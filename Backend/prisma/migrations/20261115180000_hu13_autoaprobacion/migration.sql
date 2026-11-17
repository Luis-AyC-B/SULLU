BEGIN;

-- Las solicitudes pendientes con una cuenta de estudiante activa pasan a la nómina.
WITH confirmados AS (
  UPDATE "docente_colaborador" dc
  SET "estado_solicitud" = 'APROBADO'
  FROM "estudiantes" e
  JOIN "usuarios" u ON u."id" = e."usuario_id" AND u."deleted_at" IS NULL
  WHERE dc."estado_solicitud" = 'PENDIENTE'
    AND dc."id_colaborador" = e."usuario_id"
    AND dc."id_docente" <> dc."id_colaborador"
  RETURNING dc."id_colaborador"
)
INSERT INTO "usuario_rol" ("usuario_id", "rol_id")
SELECT DISTINCT "id_colaborador", (
  SELECT "id" FROM "roles" WHERE "nombre" = 'Personal de control' AND "deleted_at" IS NULL
)
FROM confirmados
ON CONFLICT ("usuario_id", "rol_id") DO NOTHING;

-- Conserva el historial sin habilitar solicitudes rechazadas o sin una cuenta válida.
UPDATE "docente_colaborador"
SET "estado_solicitud" = 'INACTIVO'
WHERE "estado_solicitud" IN ('PENDIENTE', 'RECHAZADO');

COMMIT;
