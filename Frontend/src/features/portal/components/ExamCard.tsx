'use client';

import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { Examen, EstadoQr } from '../types/qr-examen';
import type { ExamenEstudiante } from '../types/student-exam.types';
import {
  formatearFechaCorta,
  formatearFechaYHora,
  formatearHora,
} from '../lib/formato-fechas';

export type ExamCardProps = {
  examen: Examen | ExamenEstudiante;
  isOffline?: boolean;
  onGenerarQr?: (examen: Examen) => void;
  onVerQr?: (examen: Examen) => void;
};

function esExamenNuevo(item: Examen | ExamenEstudiante): item is Examen {
  return 'estadoQr' in item && typeof (item as Examen).estadoQr === 'string';
}

function formatearFechaLegada(iso: string) {
  const partes = iso.split('-');
  if (partes.length === 3) {
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

const corregirNombre = (nombre: string) =>
  nombre.replace(/(–\s*)final\s*$/i, '$1Examen final');

export function ExamCard({
  examen,
  isOffline = false,
  onGenerarQr,
  onVerQr,
}: ExamCardProps) {
  // Solo se usa la vista mínima de respaldo si el objeto no tiene estadoQr
  if (!esExamenNuevo(examen)) {
    const legado = examen as ExamenEstudiante;
    const habilitado = legado.estado === 'Habilitado';
    const fechaTexto = legado.fecha ? formatearFechaLegada(legado.fecha) : '';
    const horaTexto =
      legado.horaInicio && legado.horaFin
        ? `${legado.horaInicio} – ${legado.horaFin}`
        : '08:00 – 10:00';
    const facultadTexto = legado.facultad ? ` (${legado.facultad})` : '';

    return (
      <article className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs sm:p-5">
        <p className="text-sm text-muted-foreground">{examen.carrera}</p>
        <h2 className="mt-1 break-words text-base font-semibold text-foreground">
          {corregirNombre(examen.nombre)}
        </h2>

        <dl className="mt-6 grid flex-1 grid-cols-1 gap-y-3 text-sm sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-4">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Ambiente</dt>
            <dd className="mt-1 break-words text-foreground">
              {examen.ambiente}
              {facultadTexto}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="mt-1 text-foreground">{fechaTexto}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Hora</dt>
            <dd className="mt-1 text-foreground">{horaTexto}</dd>
          </div>
        </dl>

        <p
          className={`mt-5 border-t border-border pt-4 text-sm font-medium ${
            habilitado ? 'text-success' : 'text-destructive'
          }`}
        >
          {habilitado ? 'Habilitado' : 'Inhabilitado'}
        </p>
      </article>
    );
  }

  // Formato nuevo con estados estadoQr y borde superior coloreado
  const estado: EstadoQr = examen.estadoQr;

  // Clases del borde superior coloreado (border-t-4)
  const bordeColor = (() => {
    switch (estado) {
      case 'NO_DISPONIBLE_AUN':
        return 'border-t-4 border-t-amber-500';
      case 'DISPONIBLE':
      case 'GENERADO':
        return 'border-t-4 border-t-emerald-600';
      case 'FINALIZADO':
        return 'border-t-4 border-t-slate-400 bg-muted/30 opacity-80';
      case 'INHABILITADO':
      default:
        return 'border-t-4 border-t-slate-400';
    }
  })();

  const rawFecha =
    ('fecha' in examen && (examen as { fecha?: string }).fecha) ||
    (examen.fechaInicio ? examen.fechaInicio.slice(0, 10) : '');
  const fechaTexto = rawFecha ? formatearFechaLegada(rawFecha) : '';
  const fechaFormateada = fechaTexto || formatearFechaCorta(examen.fechaInicio);
  const horarioFormateado = `${formatearHora(examen.fechaInicio)} – ${formatearHora(examen.fechaFin)}`;
  const horaFinTexto = formatearHora(examen.fechaFin);
  const disponibleDesdeTexto = formatearFechaYHora(examen.qrDisponibleDesde);
  const vigenteHastaTexto = formatearFechaYHora(examen.qrVigenteHasta);

  return (
    <article
      data-testid={`exam-card-${examen.id}`}
      data-estado-qr={estado}
      className={`flex h-full min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs transition-shadow hover:shadow-md sm:p-5 ${bordeColor}`}
    >
      <div className="flex flex-1 flex-col">
        {/* Fila superior: Carrera + chip de estado (hace wrap si no cabe) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {examen.carrera}
          </span>

          {estado === 'NO_DISPONIBLE_AUN' && (
            <span
              data-testid="chip-no-disponible"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span className="min-w-0 break-words">
                Disponible desde {disponibleDesdeTexto}
              </span>
            </span>
          )}

          {estado === 'DISPONIBLE' && (
            <span
              data-testid="chip-habilitado"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>Habilitado</span>
            </span>
          )}

          {estado === 'GENERADO' && (
            <span
              data-testid="chip-generado"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
            >
              <QrCode className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>QR generado</span>
            </span>
          )}

          {estado === 'FINALIZADO' && (
            <span
              data-testid="chip-finalizado"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span>Finalizado</span>
            </span>
          )}

          {estado === 'INHABILITADO' && (
            <span
              data-testid="chip-inhabilitado"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
            >
              <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>Inhabilitado</span>
            </span>
          )}
        </div>

        {/* Título de la materia / evaluación */}
        <h2 className="mt-2.5 line-clamp-2 break-words text-base font-bold text-foreground">
          {corregirNombre(examen.nombre)}
        </h2>

        {/* Filas con íconos: Ambiente, Fecha, Horario */}
        <div className="mt-4 flex flex-col gap-2 text-xs text-foreground/90 sm:text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words">
              {examen.ambiente}
              {examen.facultad ? ` (${examen.facultad})` : ''}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words">{fechaFormateada}</span>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words">{horarioFormateado}</span>
          </div>
        </div>
      </div>

      {/* Separador y pie con botones siempre al fondo */}
      <div className="mt-auto border-t border-border pt-4">
        {estado === 'NO_DISPONIBLE_AUN' && (
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              disabled
              variant="outline"
              size="sm"
              aria-label="Generar QR del examen: El QR se habilita 24 horas antes del examen"
              className="h-auto w-full cursor-not-allowed items-start justify-start self-start whitespace-normal border-muted bg-muted/50 py-2 text-left text-xs font-medium text-muted-foreground sm:w-auto"
            >
              <Clock className="mr-1.5 mt-0.5 h-4 w-4 shrink-0 opacity-60" />
              <span className="min-w-0">
                El QR se habilita 24 horas antes del examen
              </span>
            </Button>
          </div>
        )}

        {estado === 'DISPONIBLE' && (
          <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
            {isOffline ? (
              <Button
                type="button"
                disabled
                variant="outline"
                size="sm"
                className="h-auto w-full cursor-not-allowed whitespace-normal py-2 text-xs font-medium text-muted-foreground sm:w-auto"
              >
                Necesitas conexión para generar tu QR
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onGenerarQr?.(examen)}
                size="sm"
                className="w-full gap-2 bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 sm:w-auto"
              >
                <QrCode className="h-4 w-4" />
                Generar QR del examen
              </Button>
            )}

            <span className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-muted-foreground sm:self-center">
              <Clock className="h-3 w-3 shrink-0" />
              QR disponible hasta las{' '}
              {formatearHora(examen.qrVigenteHasta || examen.fechaFin)}
            </span>
          </div>
        )}

        {estado === 'GENERADO' && (
          <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={() => onVerQr?.(examen)}
              variant="default"
              size="sm"
              className="w-full gap-2 bg-primary text-xs font-semibold shadow-xs hover:bg-primary/90 sm:w-auto"
            >
              <QrCode className="h-4 w-4" />
              Ver QR
            </Button>

            <span className="inline-flex items-center gap-1 self-start rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:self-center">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Vigente hasta {vigenteHastaTexto}
            </span>
          </div>
        )}

        {estado === 'FINALIZADO' && (
          <p className="text-xs text-muted-foreground">
            Este examen terminó el {fechaFormateada} a las {horaFinTexto}. Tu QR
            del examen ya no es válido.
          </p>
        )}

        {estado === 'INHABILITADO' && (
          <p className="text-xs font-medium text-muted-foreground">
            No habilitado para rendir esta evaluación.
          </p>
        )}
      </div>
    </article>
  );
}