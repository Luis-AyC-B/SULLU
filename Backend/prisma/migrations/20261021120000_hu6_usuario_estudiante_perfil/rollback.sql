-- Rollback for 20261021120000_hu6_usuario_estudiante_perfil
ALTER TABLE "estudiantes" DROP COLUMN IF EXISTS "qr_version";
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "debe_configurar_perfil";

