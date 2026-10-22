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

export function ExamCard({
  examen,
  isOffline = false,
  onGenerarQr,
  onVerQr,
}: ExamCardProps) {
  // Manejo de compatibilidad con formato legado
  if (!esExamenNuevo(examen) || examen.esLegado) {
    const habilitado =
      'estado' in examen
        ? examen.estado === 'Habilitado'
        : examen.habilitado;

    const fechaInicio = 'fechaInicio' in examen ? examen.fechaInicio : undefined;
    const fechaFin = 'fechaFin' in examen ? examen.fechaFin : undefined;
    const rawFecha = ('fecha' in examen && examen.fecha) || (fechaInicio ? fechaInicio.slice(0, 10) : '');
    const fechaTexto = rawFecha ? formatearFechaLegada(rawFecha) : '';

    const horaTexto = 'horaInicio' in examen && examen.horaInicio
      ? `${examen.horaInicio} – ${examen.horaFin}`
      : fechaInicio && fechaFin
      ? `${formatearHora(fechaInicio)} – ${formatearHora(fechaFin)}`
      : '08:00 – 10:00';

    const facultadTexto = examen.facultad ? ` (${examen.facultad})` : '';

    return (
      <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
        <p className="text-sm text-muted-foreground">{examen.carrera}</p>
        <h2 className="mt-1 text-base font-semibold text-foreground">{examen.nombre}</h2>

        <dl className="mt-6 grid flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Ambiente</dt>
            <dd className="mt-1 text-foreground">
              {examen.ambiente}{facultadTexto}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="mt-1 text-foreground">{fechaTexto}</dd>
          </div>
          <div>
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

  const fechaFormateada = formatearFechaCorta(examen.fechaInicio);
  const horarioFormateado = `${formatearHora(examen.fechaInicio)} – ${formatearHora(examen.fechaFin)}`;
  const horaFinTexto = formatearHora(examen.fechaFin);
  const disponibleDesdeTexto = formatearFechaYHora(examen.qrDisponibleDesde);
  const vigenteHastaTexto = formatearFechaYHora(examen.qrVigenteHasta);

  return (
    <article
      data-testid={`exam-card-${examen.id}`}
      data-estado-qr={estado}
      className={`flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-shadow hover:shadow-md ${bordeColor}`}
    >
      <div>
        {/* Fila superior: Carrera a la izquierda, Chip de estado a la derecha */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {examen.carrera}
          </span>

          {estado === 'NO_DISPONIBLE_AUN' && (
            <span
              data-testid="chip-no-disponible"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span>Disponible desde {disponibleDesdeTexto}</span>
            </span>
          )}

          {estado === 'DISPONIBLE' && (
            <span
              data-testid="chip-habilitado"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>Habilitado</span>
            </span>
          )}

          {estado === 'GENERADO' && (
            <span
              data-testid="chip-generado"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
            >
              <QrCode className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>QR generado</span>
            </span>
          )}

          {estado === 'FINALIZADO' && (
            <span
              data-testid="chip-finalizado"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span>Finalizado</span>
            </span>
          )}

          {estado === 'INHABILITADO' && (
            <span
              data-testid="chip-inhabilitado"
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
            >
              <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>Inhabilitado</span>
            </span>
          )}
        </div>

        {/* Título de la materia / evaluación */}
        <h2 className="mt-2.5 text-base font-bold text-foreground line-clamp-2">
          {examen.nombre}
        </h2>

        {/* Filas con íconos: Ambiente, Fecha, Horario */}
        <div className="mt-4 flex flex-col gap-2 text-xs sm:text-sm text-foreground/90">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {examen.ambiente}
              {examen.facultad ? ` (${examen.facultad})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{fechaFormateada}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{horarioFormateado}</span>
          </div>
        </div>
      </div>

      {/* Separador y Pie con botones según el estado */}
      <div className="mt-5 border-t border-border pt-4">
        {estado === 'NO_DISPONIBLE_AUN' && (
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              disabled
              variant="outline"
              size="sm"
              className="w-full sm:w-auto self-start text-xs font-medium text-muted-foreground cursor-not-allowed bg-muted/50 border-muted"
            >
              <QrCode className="h-4 w-4 mr-1.5 opacity-60" />
              Generar QR del examen
            </Button>
            <p className="text-[11px] text-muted-foreground">
              El QR se habilita 24 horas antes del examen
            </p>
          </div>
        )}

        {estado === 'DISPONIBLE' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {isOffline ? (
              <Button
                type="button"
                disabled
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs font-medium text-muted-foreground cursor-not-allowed"
              >
                Necesitas conexión para generar tu QR
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onGenerarQr?.(examen)}
                size="sm"
                className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
              >
                <QrCode className="h-4 w-4" />
                Generar QR del examen
              </Button>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground self-start sm:self-center">
              <Clock className="h-3 w-3" />
              QR disponible hasta las {horaFinTexto}
            </span>
          </div>
        )}

        {estado === 'GENERADO' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <Button
              type="button"
              onClick={() => onVerQr?.(examen)}
              variant="default"
              size="sm"
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-xs font-semibold shadow-xs"
            >
              <QrCode className="h-4 w-4" />
              Ver QR
            </Button>

            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Vigente hasta {vigenteHastaTexto}
            </span>
          </div>
        )}

        {estado === 'FINALIZADO' && (
          <p className="text-xs text-muted-foreground">
            Este examen terminó el {fechaFormateada} a las {horaFinTexto}. Tu QR del examen ya no es válido.
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
