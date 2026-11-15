BEGIN;

-- La bitácora conserva el ID y el nombre histórico aunque se retire la cuenta.
ALTER TABLE bitacora_auditoria
  DROP CONSTRAINT bitacora_auditoria_usuario_id_fkey;

-- Los módulos recuperan su borrado habitual y la fila queda en el archivo.
DO $$
DECLARE tabla TEXT;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'examenes', 'examen_controlador', 'examen_carrera_materia',
    'examen_estudiante', 'ingresos', 'expulsion'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER hu21_conservar BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hu21_archivar_registro()',
      tabla
    );
  END LOOP;
END $$;

-- Las bajas previas ya tienen su evento. Archivar sus filas sin repetirlo.
ALTER TABLE examen_controlador DISABLE TRIGGER hu21_auditar;
DELETE FROM examen_controlador WHERE deleted_at IS NOT NULL;
ALTER TABLE examen_controlador ENABLE TRIGGER hu21_auditar;

COMMIT;
