import { EstadoExamen } from '@prisma/client';

// Bolivia es UTC-4 todo el año (sin horario de verano).
const OFFSET_BOLIVIA_HORAS = 4;

/**
 * Une la fecha (@db.Date) y la hora (@db.Time) de la reserva en un instante real.
 * Prisma devuelve ambas en UTC: fecha = 2026-11-02T00:00Z, hora = 1970-01-01T14:15Z.
 * La hora guardada es "hora de pared" de Bolivia, así que se suma el offset
 * para obtener el instante UTC correcto, sin depender de la zona del servidor.
 */
export function combinarBolivia(fecha: Date, hora: Date): Date {
  const [y, m, d] = fecha.toISOString().slice(0, 10).split('-').map(Number);
  return new Date(
    Date.UTC(
      y,
      m - 1,
      d,
      hora.getUTCHours() + OFFSET_BOLIVIA_HORAS,
      hora.getUTCMinutes(),
    ),
  );
}

type ExamenConHorario = {
  estado: EstadoExamen;
  reservaAmbiente?: {
    fecha: Date;
    horarioFijo?: { horaIni: Date; horaFin: Date } | null;
  } | null;
};

/** Estado real: se calcula comparando la hora actual con el horario del examen. */
export function estadoEfectivo(
  examen: ExamenConHorario,
  ahora: Date = new Date(),
): EstadoExamen {
  if (examen.estado === EstadoExamen.CANCELADO) return EstadoExamen.CANCELADO;

  const r = examen.reservaAmbiente;
  if (!r?.fecha || !r.horarioFijo) return examen.estado;

  const inicio = combinarBolivia(r.fecha, r.horarioFijo.horaIni);
  const fin = combinarBolivia(r.fecha, r.horarioFijo.horaFin);

  if (ahora < inicio) return EstadoExamen.PROGRAMADO;
  if (ahora <= fin) return EstadoExamen.EN_CURSO;
  return EstadoExamen.FINALIZADO;
}
