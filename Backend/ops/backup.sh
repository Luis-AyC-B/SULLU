#!/bin/sh
set -eu
export TZ=America/La_Paz
BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_INTERVAL_SECONDS=${BACKUP_INTERVAL_SECONDS:-86400}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
case "$BACKUP_INTERVAL_SECONDS:$BACKUP_RETENTION_DAYS" in *[!0-9:]*|:*|*:) echo 'Frecuencia y retención deben ser números'; exit 1;; esac
[ "$BACKUP_INTERVAL_SECONDS" -ge 60 ] && [ "$BACKUP_RETENTION_DAYS" -ge 1 ] || { echo 'Frecuencia mínima 60 segundos; retención mínima 1 día'; exit 1; }
case "$BACKUP_DIR" in /backups) ;; *) echo 'BACKUP_DIR debe ser /backups'; exit 1;; esac
mkdir -p "$BACKUP_DIR"

publicar_historial() {
  # El JSONL sigue disponible cuando PostgreSQL no acepta conexiones.
  # La próxima ejecución publica también los intentos anteriores.
  psql -X -v ON_ERROR_STOP=1 --quiet <<'SQL'
BEGIN;
CREATE TEMP TABLE respaldos_importados (entrada jsonb) ON COMMIT DROP;
\copy respaldos_importados FROM '/backups/ejecuciones.jsonl' WITH (FORMAT csv, DELIMITER E'\x01', QUOTE E'\x02')
INSERT INTO public.ejecuciones_respaldo
  (fecha_hora, archivo, estado, tamano_bytes, restaurado_en_prueba)
SELECT (entrada->>'fecha')::timestamptz,
       entrada->>'archivo',
       entrada->>'estado',
       (entrada->>'tamano_bytes')::bigint,
       COALESCE((entrada->>'restaurado_en_prueba')::boolean, false)
FROM respaldos_importados
ON CONFLICT (fecha_hora, archivo) DO NOTHING;
COMMIT;
SQL
}

respaldar() (
  marca=$(date -u +%Y%m%dT%H%M%SZ)_$$
  archivo="exacontrol_$marca.dump"
  temporal="$BACKUP_DIR/$archivo.partial"
  prueba="hu21_restore_$marca"
  prueba=$(printf '%s' "$prueba" | tr '[:upper:]' '[:lower:]')
  periodo=$(date -d "$(date +%Y-%m-01) -1 day" +%Y-%m)
  limpiar() {
    # Solo una BD efímera generada por este proceso; jamás se restaura sobre la original.
    case "$prueba" in hu21_restore_*) dropdb --if-exists "$prueba" >/dev/null 2>&1 || true;; esac
    rm -f "$temporal"
  }
  trap limpiar EXIT
  trap 'exit 1' INT TERM
  if pg_dump --format=custom --no-owner --file="$temporal" &&
    pg_restore --list "$temporal" >/dev/null &&
    createdb "$prueba" &&
    pg_restore --single-transaction --exit-on-error --no-owner --dbname="$prueba" "$temporal" &&
    psql -X -v ON_ERROR_STOP=1 --dbname="$prueba" -Atc 'SELECT count(*) FROM bitacora_auditoria; SELECT count(*) FROM usuarios; SELECT count(*) FROM archivo_registros_hu21;' >"$BACKUP_DIR/$archivo.verify" &&
    tamano=$(wc -c <"$temporal") &&
    mv "$temporal" "$BACKUP_DIR/$archivo";
  then
    printf '{"fecha":"%s","archivo":"%s","estado":"EXITOSO","tamano_bytes":%s,"restaurado_en_prueba":true}\n' "$(date -u +%FT%TZ)" "$archivo" "$tamano" >>"$BACKUP_DIR/ejecuciones.jsonl"
    printf '%s\n' "$archivo" >"$BACKUP_DIR/cierre_$periodo"
    # Solo copias generadas por este script, dentro del volumen verificado.
    find /backups -maxdepth 1 -type f -name 'exacontrol_*.dump*' -mtime "+$BACKUP_RETENTION_DAYS" -delete
  else
    printf '{"fecha":"%s","archivo":"%s","estado":"FALLIDO"}\n' "$(date -u +%FT%TZ)" "$archivo" >>"$BACKUP_DIR/ejecuciones.jsonl"
    publicar_historial || echo 'Historial pendiente de sincronizar con PostgreSQL' >&2
    exit 1
  fi
  publicar_historial || echo 'Historial pendiente de sincronizar con PostgreSQL' >&2
)

restaurar_pendiente() (
  # Comparte el bloqueo del volumen para proteger la copia frente a la retención.
  flock -n 9 || exit 0
  trabajo=$(psql -X -v ON_ERROR_STOP=1 -qAt -F '|' <<'SQL'
UPDATE public.restauraciones_respaldo
SET estado = 'FALLIDA', error = 'INTERRUMPIDA'
WHERE estado = 'EN_PROCESO';
UPDATE public.restauraciones_respaldo
SET estado = 'EN_PROCESO'
WHERE id = (
  SELECT id FROM public.restauraciones_respaldo WHERE estado = 'PENDIENTE'
  ORDER BY solicitada_en, id LIMIT 1 FOR UPDATE SKIP LOCKED
)
RETURNING id, archivo;
SQL
  ) || exit 1
  [ -n "$trabajo" ] || exit 0
  id=${trabajo%%|*}
  archivo=${trabajo#*|}
  case "$id" in ''|*[!0-9]*) exit 1;; esac
  base="hu21_recuperacion_$(date -u +%Y%m%d%H%M%S)_$id"
  error=ARCHIVO_NO_DISPONIBLE

  if printf '%s\n' "$archivo" | grep -Eq '^exacontrol_[0-9]{8}T[0-9]{6}Z_[0-9]+\.dump$' &&
    [ -f "$BACKUP_DIR/$archivo" ]; then
    error=ERROR_RESTAURACION
    if createdb --template=template0 "$base"; then
      if psql -X -v ON_ERROR_STOP=1 --dbname="$base" -qc "REVOKE CONNECT ON DATABASE \"$base\" FROM PUBLIC" &&
        pg_restore --single-transaction --exit-on-error --no-owner --no-acl --dbname="$base" "$BACKUP_DIR/$archivo" &&
        psql -X -v ON_ERROR_STOP=1 -qc "UPDATE public.restauraciones_respaldo SET estado='COMPLETADA', base_restaurada='$base' WHERE id=$id";
      then
        exit 0
      fi
      dropdb --if-exists "$base" || true
    fi
  fi
  psql -X -v ON_ERROR_STOP=1 -qc "UPDATE public.restauraciones_respaldo SET estado='FALLIDA', error='$error' WHERE id=$id"
) 9>"$BACKUP_DIR/.backup.lock"

procesar_respaldos() (
  flock -n 9 || exit 0
  tipo=$(psql -X -v ON_ERROR_STOP=1 -qAt <<'SQL'
UPDATE public.programacion_respaldos
SET latido = now(),
    proximo_automatico = COALESCE(proximo_automatico, now()),
    resultado_manual = CASE WHEN ejecucion = 'MANUAL' THEN 'FALLIDO' ELSE resultado_manual END,
    manual_pendiente = CASE
      WHEN proximo_automatico > now() AND manual_pendiente THEN false
      ELSE manual_pendiente
    END,
    ejecucion = CASE
      WHEN COALESCE(proximo_automatico, now()) <= now() THEN 'AUTOMATICA'
      WHEN manual_pendiente THEN 'MANUAL'
    END
WHERE id = 1
RETURNING ejecucion;
SQL
  ) || exit 1
  [ -n "$tipo" ] || exit 0
  resultado=EXITOSO
  respaldar || resultado=FALLIDO
  psql -X -v ON_ERROR_STOP=1 -q \
    -v intervalo="$BACKUP_INTERVAL_SECONDS" -v resultado="$resultado" <<'SQL'
UPDATE public.programacion_respaldos
SET latido = now(),
    proximo_automatico = CASE
      WHEN ejecucion = 'AUTOMATICA' THEN now() + make_interval(secs => :intervalo)
      ELSE proximo_automatico
    END,
    resultado_manual = CASE WHEN ejecucion = 'MANUAL' THEN :'resultado' ELSE resultado_manual END,
    ejecucion = NULL
WHERE id = 1;
SQL
) 9>"$BACKUP_DIR/.backup.lock"

if [ "${1:-}" = '--once' ]; then
  (flock -n 9 && respaldar) 9>"$BACKUP_DIR/.backup.lock"
  exit
fi
if [ "${1:-}" = '--restaurar-pendiente' ]; then restaurar_pendiente; exit; fi

while :; do
  procesar_respaldos || echo 'No se pudo procesar la programación de respaldos' >&2
  restaurar_pendiente || echo 'No se pudo procesar la cola de restauraciones' >&2
  sleep 10
done
