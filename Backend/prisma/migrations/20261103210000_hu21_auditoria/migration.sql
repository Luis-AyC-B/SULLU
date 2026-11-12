BEGIN;

ALTER TABLE bitacora_auditoria ADD COLUMN registro_clave JSONB;
ALTER TABLE examen_controlador ADD COLUMN deleted_at TIMESTAMP(6);
ALTER TABLE bitacora_auditoria ADD COLUMN usuario_nombre TEXT;
CREATE INDEX bitacora_auditoria_fecha_hora_id_idx ON bitacora_auditoria(fecha_hora, id);
CREATE INDEX bitacora_auditoria_usuario_id_fecha_hora_idx ON bitacora_auditoria(usuario_id, fecha_hora);
CREATE INDEX bitacora_auditoria_accion_fecha_hora_idx ON bitacora_auditoria(accion, fecha_hora);
CREATE INDEX bitacora_auditoria_tabla_afectada_fecha_hora_idx ON bitacora_auditoria(tabla_afectada, fecha_hora);

-- Redactar también objetos anidados de eventos escritos por servicios existentes.
CREATE FUNCTION auditoria_datos_seguros(datos JSONB) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE resultado JSONB; clave TEXT; valor JSONB;
BEGIN
  IF datos IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(datos) = 'object' THEN
    resultado := '{}';
    FOR clave, valor IN SELECT * FROM jsonb_each(datos) LOOP
      IF clave !~* '(password|token|secret|session|contras|hash|foto|archivo|biometr)' THEN
        resultado := resultado || jsonb_build_object(clave, auditoria_datos_seguros(valor));
      END IF;
    END LOOP;
    RETURN resultado;
  ELSIF jsonb_typeof(datos) = 'array' THEN
    SELECT coalesce(jsonb_agg(auditoria_datos_seguros(value)), '[]') INTO resultado FROM jsonb_array_elements(datos);
    RETURN resultado;
  END IF;
  RETURN datos;
END $$;

-- Se sanea el historial previo sin inventar datos anteriores que no fueron guardados.
UPDATE bitacora_auditoria SET detalles_anterior = auditoria_datos_seguros(detalles_anterior), detalles_nuevo = auditoria_datos_seguros(detalles_nuevo);
UPDATE bitacora_auditoria b SET usuario_nombre = trim(concat_ws(' ', u.nombre, u.apellido)) FROM usuarios u WHERE u.id = b.usuario_id;

CREATE FUNCTION auditoria_preparar_evento() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.detalles_anterior := auditoria_datos_seguros(NEW.detalles_anterior);
  NEW.detalles_nuevo := auditoria_datos_seguros(NEW.detalles_nuevo);
  NEW.usuario_id := coalesce(NEW.usuario_id, nullif(current_setting('app.usuario_id', true), '')::integer);
  NEW.ip_origen := coalesce(NEW.ip_origen, nullif(current_setting('app.ip', true), ''));
  IF NEW.usuario_nombre IS NULL THEN
    SELECT trim(concat_ws(' ', nombre, apellido)) INTO NEW.usuario_nombre FROM usuarios WHERE id = NEW.usuario_id;
  END IF;
  NEW.usuario_nombre := coalesce(NEW.usuario_nombre, 'Sistema');
  RETURN NEW;
END $$;
CREATE TRIGGER auditoria_preparar BEFORE INSERT ON bitacora_auditoria FOR EACH ROW EXECUTE FUNCTION auditoria_preparar_evento();

CREATE FUNCTION auditoria_inmutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'El historial de auditoría es inmutable';
END $$;
CREATE TRIGGER auditoria_proteger BEFORE UPDATE OR DELETE ON bitacora_auditoria FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();
CREATE TRIGGER auditoria_proteger_truncate BEFORE TRUNCATE ON bitacora_auditoria FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable();

CREATE OR REPLACE FUNCTION public.auditoria_registrar_cambio()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE anterior JSONB; nuevo JSONB; clave JSONB := '{}'; columna TEXT; operacion TEXT; datos JSONB;
BEGIN
  IF TG_OP <> 'INSERT' THEN anterior := auditoria_datos_seguros(to_jsonb(OLD)); END IF;
  IF TG_OP <> 'DELETE' THEN nuevo := auditoria_datos_seguros(to_jsonb(NEW)); END IF;
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) - 'session_id' = to_jsonb(NEW) - 'session_id' THEN RETURN NEW; END IF;
    IF anterior = nuevo THEN
      nuevo := nuevo || jsonb_build_object('_datos_protegidos', 'Actualizados; valores excluidos del historial');
    END IF;
  END IF;
  datos := coalesce(nuevo, anterior);
  FOR columna IN
    SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = TG_RELID AND i.indisprimary ORDER BY a.attnum
  LOOP
    clave := clave || jsonb_build_object(columna, datos -> columna);
  END LOOP;
  operacion := CASE TG_OP WHEN 'INSERT' THEN 'CREACION' WHEN 'DELETE' THEN 'ELIMINACION' ELSE 'MODIFICACION' END;
  IF TG_OP = 'UPDATE' AND (
    (anterior ->> 'deleted_at' IS NULL AND nuevo ->> 'deleted_at' IS NOT NULL) OR
    (TG_TABLE_NAME = 'examenes' AND anterior ->> 'estado' <> 'CANCELADO' AND nuevo ->> 'estado' = 'CANCELADO') OR
    (TG_TABLE_NAME = 'docente_colaborador' AND anterior ->> 'estado_solicitud' <> 'INACTIVO' AND nuevo ->> 'estado_solicitud' = 'INACTIVO') OR
    (TG_TABLE_NAME = 'reserva_ambiente' AND anterior ->> 'estado' <> 'CANCELADO' AND nuevo ->> 'estado' = 'CANCELADO')
  ) THEN operacion := 'ELIMINACION'; END IF;
  IF TG_OP = 'UPDATE' AND anterior ->> 'deleted_at' IS NOT NULL AND nuevo ->> 'deleted_at' IS NULL THEN operacion := 'CREACION'; END IF;
  INSERT INTO bitacora_auditoria(accion, modulo, tabla_afectada, registro_id, registro_clave, detalles_anterior, detalles_nuevo)
  VALUES(operacion, 'CRUD', TG_TABLE_NAME, (datos ->> 'id')::integer, clave, anterior, nuevo);
  RETURN coalesce(NEW, OLD);
END $function$;


DO $$ DECLARE tabla TEXT; BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'usuarios','roles','usuario_rol','rol_permiso','rol_modulo','usuario_alcance',
    'facultades','carreras','materias','carrera_materia','ambientes','tipo_aula','horario_fijo',
    'reserva_ambiente','examenes','examen_carrera_materia','cargas_estudiantes','estudiantes',
    'examen_estudiante','ingresos','docente_colaborador','examen_controlador','incidencia_ingreso','fotos_estudiante','codigos_qr'
  ] LOOP
    EXECUTE format('CREATE TRIGGER hu21_auditar AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION auditoria_registrar_cambio()', tabla);
  END LOOP;
END $$;


-- Una reserva puede mantener sus exámenes cancelados, con un único examen activo.
DROP INDEX "examenes_id_reservaAmbiente_key";
CREATE UNIQUE INDEX examenes_reserva_activa_key ON examenes ("id_reservaAmbiente") WHERE estado <> 'CANCELADO';

-- Historial recuperable: solo fecha y responsable ya almacenados; no se inventan valores iniciales.
INSERT INTO bitacora_auditoria(usuario_id, accion, modulo, tabla_afectada, registro_id, registro_clave, detalles_nuevo, fecha_hora)
SELECT e.id_usuario, 'CREACION', 'CRUD', 'examenes', e.id, jsonb_build_object('id',e.id),
       jsonb_build_object('id',e.id,'origen','Registro existente: fecha creado_en y responsable id_usuario; valores iniciales no disponibles'), e.creado_en
FROM examenes e WHERE NOT EXISTS (SELECT 1 FROM bitacora_auditoria a WHERE a.tabla_afectada='examenes' AND a.registro_id=e.id AND a.accion='CREACION');

-- Descripción legible independiente de las pantallas de los otros módulos.
-- Las nuevas operaciones conservan la descripción en su propia instantánea.
CREATE FUNCTION auditoria_identificar_registro(tabla TEXT, datos JSONB)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE nombre TEXT; detalle TEXT; referencia INTEGER;
BEGIN
  IF datos IS NULL THEN RETURN NULL; END IF;
  IF tabla = 'examenes' THEN
    SELECT string_agg(DISTINCT m.nombre, ', ' ORDER BY m.nombre) INTO nombre
      FROM examen_carrera_materia em JOIN materias m ON m.id = em.id_materia
      WHERE em.id_examen = (datos->>'id')::integer;
    SELECT concat_ws(' · ', coalesce(datos->>'tipo_examen', e.tipo_examen), a.nombre)
      INTO detalle FROM examenes e JOIN reserva_ambiente r ON r.id = e."id_reservaAmbiente"
      JOIN ambientes a ON a.id = r.ambiente_id WHERE e.id = (datos->>'id')::integer;
    RETURN concat_ws(' · ', 'Examen: ' || coalesce(nombre, 'sin materia vinculada'),
      coalesce(nullif(detalle, ''), datos->>'tipo_examen'));
  ELSIF tabla IN ('usuarios', 'estudiantes') THEN
    RETURN concat_ws(' · ', nullif(trim(concat_ws(' ', datos->>'nombre', datos->>'apellido')), ''),
      coalesce(datos->>'correo', datos->>'email', datos->>'cod_sis'));
  ELSIF tabla IN ('docente_colaborador', 'examen_controlador') THEN
    SELECT trim(concat_ws(' ', u.nombre, u.apellido)) INTO nombre FROM usuarios u
      WHERE u.id = (datos->>'id_colaborador')::integer;
    RETURN concat_ws(' · ', 'Colaborador: ' || coalesce(nullif(nombre, ''),
      nullif(trim(concat_ws(' ', datos->>'nombres_solicitados', datos->>'apellidos_solicitados')), ''),
      datos->>'correo_solicitado', 'sin nombre disponible'),
      CASE WHEN tabla = 'examen_controlador' THEN 'Examen #' || (datos->>'id_examen') END);
  ELSIF tabla IN ('ambientes', 'materias', 'carreras', 'facultades', 'roles', 'tipo_aula') THEN
    RETURN concat_ws(' · ', datos->>'nombre', datos->>'sigla');
  ELSIF tabla IN ('examen_carrera_materia', 'carrera_materia') THEN
    SELECT m.nombre INTO nombre FROM materias m WHERE m.id = (datos->>'id_materia')::integer;
    SELECT c.nombre INTO detalle FROM carreras c WHERE c.id = (datos->>'id_carrera')::integer;
    RETURN concat_ws(' · ', nombre, detalle, 'Examen #' || (datos->>'id_examen'));
  ELSIF tabla = 'reserva_ambiente' THEN
    SELECT a.nombre INTO nombre FROM ambientes a WHERE a.id = (datos->>'ambiente_id')::integer;
    RETURN concat_ws(' · ', 'Reserva: ' || nombre, datos->>'fecha');
  ELSE
    referencia := coalesce(datos->>'estudiante_id', datos->>'id_estudiante')::integer;
    IF referencia IS NOT NULL THEN
      SELECT trim(concat_ws(' ', e.nombre, e.apellido)) INTO nombre FROM estudiantes e WHERE e.id = referencia;
    ELSE
      referencia := coalesce(datos->>'usuario_id', datos->>'id_usuario')::integer;
      SELECT trim(concat_ws(' ', u.nombre, u.apellido)) INTO nombre FROM usuarios u WHERE u.id = referencia;
    END IF;
    RETURN nullif(concat_ws(' · ', nombre, datos->>'nombre', datos->>'periodo_nombre',
      datos->>'tipo_incidencia', datos->>'metodo',
      'Examen #' || coalesce(datos->>'examen_id', datos->>'id_examen'),
      'Rol #' || (datos->>'rol_id'), 'Permiso #' || (datos->>'permiso_id'),
      'Módulo #' || (datos->>'modulo_id')), '');
  END IF;
END $$;

-- Reutilizar el trigger CRUD existente, añadiendo la identificación al JSON seguro.
DO $$ DECLARE definicion TEXT; BEGIN
  SELECT pg_get_functiondef('auditoria_registrar_cambio()'::regprocedure) INTO definicion;
  definicion := replace(definicion,
    'datos := coalesce(nuevo, anterior);',
    'datos := coalesce(nuevo, anterior);
     IF nuevo IS NOT NULL THEN
       nuevo := nuevo || jsonb_build_object(''_registro'', auditoria_identificar_registro(TG_TABLE_NAME, nuevo));
     END IF;
     IF anterior IS NOT NULL THEN
       anterior := anterior || jsonb_build_object(''_registro'', auditoria_identificar_registro(TG_TABLE_NAME, anterior));
     END IF;');
  EXECUTE definicion;
END $$;

-- Al crear un examen sus materias se insertan después de la fila principal.
-- Esperar al cierre de la transacción permite guardar sus nombres reales.
DROP TRIGGER hu21_auditar ON examenes;
CREATE CONSTRAINT TRIGGER hu21_auditar AFTER INSERT OR UPDATE OR DELETE ON examenes
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION auditoria_registrar_cambio();

-- Completar la captura de tablas de negocio sin modificar sus servicios.
-- Tokens de recuperación y la propia bitácora se excluyen deliberadamente.
CREATE TRIGGER hu21_auditar AFTER INSERT OR UPDATE OR DELETE ON modulos
  FOR EACH ROW EXECUTE FUNCTION auditoria_registrar_cambio();
CREATE TRIGGER hu21_auditar AFTER INSERT OR UPDATE OR DELETE ON permisos
  FOR EACH ROW EXECUTE FUNCTION auditoria_registrar_cambio();

-- Archivo separado: conserva la fila retirada sin cambiar las consultas,
-- claves únicas, respuestas ni reglas de los módulos existentes.
CREATE TABLE archivo_registros_hu21 (
  id BIGSERIAL PRIMARY KEY,
  tabla_origen TEXT NOT NULL,
  registro_clave JSONB NOT NULL,
  datos JSONB NOT NULL,
  usuario_id INTEGER,
  usuario_nombre TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ip_origen VARCHAR(45)
);
CREATE INDEX archivo_registros_hu21_tabla_fecha_idx ON archivo_registros_hu21(tabla_origen, fecha_hora);
CREATE INDEX archivo_registros_hu21_clave_idx ON archivo_registros_hu21 USING GIN(registro_clave);

CREATE FUNCTION hu21_archivar_registro() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE datos JSONB := to_jsonb(OLD); clave JSONB := '{}'; columna TEXT;
        actor INTEGER := nullif(current_setting('app.usuario_id', true), '')::integer;
        responsable TEXT;
BEGIN
  FOR columna IN
    SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
    WHERE i.indrelid=TG_RELID AND i.indisprimary ORDER BY a.attnum
  LOOP
    clave := clave || jsonb_build_object(columna, datos->columna);
  END LOOP;
  SELECT trim(concat_ws(' ', nombre, apellido)) INTO responsable FROM usuarios WHERE id=actor;
  INSERT INTO archivo_registros_hu21(tabla_origen, registro_clave, datos, usuario_id, usuario_nombre, ip_origen)
    VALUES(TG_TABLE_NAME, clave, datos, actor, coalesce(responsable,'Sistema'),
      nullif(current_setting('app.ip',true),''));
  RETURN OLD;
END $$;

DO $$ DECLARE tabla TEXT; BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'facultades','carreras','materias','carrera_materia',
    'ambientes','tipo_aula','horario_fijo',
    'modulos','permisos','usuario_alcance','usuario_rol','rol_permiso','rol_modulo'
  ] LOOP
    EXECUTE format('CREATE TRIGGER hu21_conservar BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hu21_archivar_registro()',tabla);
  END LOOP;
END $$;

CREATE TRIGGER hu21_archivo_inmutable BEFORE UPDATE OR DELETE ON archivo_registros_hu21
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();
CREATE TRIGGER hu21_archivo_no_truncate BEFORE TRUNCATE ON archivo_registros_hu21
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable();

-- Exclusiones deliberadas: fotos, estudiantes/cargas, QR, exámenes y sus
-- relaciones, ingresos e incidencias. No se cambian sus triggers existentes.
-- Usuarios/roles/colaboradores conservan las bajas que ya tenían implementadas.

CREATE OR REPLACE FUNCTION auditoria_nombre_referencia(tabla TEXT, identificador INTEGER)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE registro JSONB; etiqueta TEXT;
BEGIN
  IF tabla NOT IN ('usuarios','roles','permisos','modulos','facultades','carreras','materias','tipo_aula','ambientes','horario_fijo','examenes','estudiantes','reserva_ambiente') THEN RETURN NULL; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE id=$1',tabla) INTO registro USING identificador;
  IF registro IS NULL THEN
    SELECT a.datos INTO registro FROM archivo_registros_hu21 a
      WHERE a.tabla_origen=tabla AND a.registro_clave @> jsonb_build_object('id',identificador)
      ORDER BY a.fecha_hora DESC, a.id DESC LIMIT 1;
  END IF;
  IF registro IS NULL THEN RETURN NULL; END IF;
  IF tabla='permisos' THEN
    etiqueta := coalesce(nullif(registro->>'descripcion',''),registro->>'clave');
  ELSIF tabla IN ('usuarios','estudiantes') THEN
    etiqueta := trim(concat_ws(' ',registro->>'nombre',registro->>'apellido'));
  ELSIF tabla='horario_fijo' THEN
    etiqueta := concat_ws(' · ',registro->>'periodo_nombre',registro->>'dia_semana');
  ELSIF tabla IN ('examenes','reserva_ambiente') THEN
    etiqueta := auditoria_identificar_registro(tabla,registro);
  ELSE etiqueta := concat_ws(' · ',registro->>'nombre',registro->>'sigla');
  END IF;
  RETURN nullif(etiqueta,'');
END $$;

CREATE OR REPLACE FUNCTION auditoria_referencias(datos JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE campo TEXT; valor JSONB; tabla TEXT; nombre TEXT; referencias JSONB := '{}';
BEGIN
  IF datos IS NULL OR jsonb_typeof(datos)<>'object' THEN RETURN referencias; END IF;
  FOR campo,valor IN SELECT * FROM jsonb_each(datos) LOOP
    tabla := CASE
      WHEN campo='rol_id' THEN 'roles'
      WHEN campo='permiso_id' THEN 'permisos'
      WHEN campo='modulo_id' THEN 'modulos'
      WHEN campo='id_facultad' THEN 'facultades'
      WHEN campo='id_carrera' THEN 'carreras'
      WHEN campo='id_materia' THEN 'materias'
      WHEN campo='id_tipoAula' THEN 'tipo_aula'
      WHEN campo='ambiente_id' THEN 'ambientes'
      WHEN campo='horario_fijo_id' THEN 'horario_fijo'
      WHEN campo='id_reservaAmbiente' THEN 'reserva_ambiente'
      WHEN campo IN ('usuario_id','id_usuario','docente_id','id_docente','id_colaborador','asignado_por','registrado_por','cargado_por','aprobado_por') THEN 'usuarios'
      WHEN campo IN ('estudiante_id','id_estudiante') THEN 'estudiantes'
      WHEN campo IN ('examen_id','id_examen') THEN 'examenes'
    END;
    IF tabla IS NOT NULL AND valor #>> '{}' ~ '^[0-9]+$' THEN
      nombre := auditoria_nombre_referencia(tabla,(valor #>> '{}')::integer);
      IF nombre IS NOT NULL THEN referencias := referencias || jsonb_build_object(campo,nombre); END IF;
    END IF;
  END LOOP;
  RETURN referencias;
END $$;

-- Guardar nombres en el instante de la operación, además de las claves reales.
DO $$ DECLARE definicion TEXT; BEGIN
  SELECT pg_get_functiondef('auditoria_registrar_cambio()'::regprocedure) INTO definicion;
  IF position('''_referencias''' IN definicion)=0 THEN
    definicion := replace(definicion, 'datos := coalesce(nuevo, anterior);',
      'IF nuevo IS NOT NULL THEN nuevo := nuevo || jsonb_build_object(''_referencias'',auditoria_referencias(nuevo)); END IF;
       IF anterior IS NOT NULL THEN anterior := anterior || jsonb_build_object(''_referencias'',auditoria_referencias(anterior)); END IF;
       datos := coalesce(nuevo, anterior);');
    EXECUTE definicion;
  END IF;
END $$;

DO $$ DECLARE definicion TEXT; BEGIN
  SELECT pg_get_functiondef('auditoria_identificar_registro(text,jsonb)'::regprocedure) INTO definicion;
  IF position('jsonb_each_text(auditoria_referencias(datos))' IN definicion)=0 THEN
    definicion := replace(definicion, 'IF datos IS NULL THEN RETURN NULL; END IF;',
      'IF datos IS NULL THEN RETURN NULL; END IF;
       IF tabla IN (''usuario_rol'',''rol_permiso'',''rol_modulo'',''usuario_alcance'') THEN
         SELECT string_agg(value,'' · '' ORDER BY key) INTO nombre FROM jsonb_each_text(auditoria_referencias(datos));
         RETURN nombre;
       END IF;');
    EXECUTE definicion;
  END IF;
END $$;

COMMIT;
