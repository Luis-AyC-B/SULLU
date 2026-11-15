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

respaldar() (
  # Un único proceso por volumen, incluso con dos invocaciones simultáneas.
  flock -n 9 || { echo 'Ya hay un respaldo en ejecución'; exit 1; }
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
    psql -X -v ON_ERROR_STOP=1 --dbname="$prueba" -Atc 'SELECT count(*) FROM bitacora_auditoria; SELECT count(*) FROM usuarios; SELECT count(*) FROM archivo_registros_hu21;' >"$BACKUP_DIR/$archivo.verify";
  then
    mv "$temporal" "$BACKUP_DIR/$archivo"
    printf '{"fecha":"%s","archivo":"%s","estado":"EXITOSO","restaurado_en_prueba":true}\n' "$(date -u +%FT%TZ)" "$archivo" >>"$BACKUP_DIR/ejecuciones.jsonl"
    printf '%s\n' "$archivo" >"$BACKUP_DIR/cierre_$periodo"
    # Solo copias generadas por este script, dentro del volumen verificado.
    find /backups -maxdepth 1 -type f -name 'exacontrol_*.dump*' -mtime "+$BACKUP_RETENTION_DAYS" -delete
  else
    printf '{"fecha":"%s","archivo":"%s","estado":"FALLIDO"}\n' "$(date -u +%FT%TZ)" "$archivo" >>"$BACKUP_DIR/ejecuciones.jsonl"
    exit 1
  fi
) 9>"$BACKUP_DIR/.backup.lock"

if [ "${1:-}" = '--once' ]; then respaldar; exit; fi
while :; do respaldar || echo 'Respaldo fallido; revisar el registro de ejecuciones'; sleep "$BACKUP_INTERVAL_SECONDS"; done
