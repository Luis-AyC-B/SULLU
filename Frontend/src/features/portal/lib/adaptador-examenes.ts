import type { EstadoQr, Examen, RespuestaExamenes } from '../types/qr-examen';
import type { ExamenEstudiante } from '../types/student-exam.types';

// TEMPORAL: cálculo de estadoQr en base al reloj del dispositivo cuando el servidor no lo envía
export function calcularEstadoQrTemporal(
  habilitado: boolean,
  fechaInicioIso: string,
  fechaFinIso: string
): EstadoQr {
  if (!habilitado) {
    return 'INHABILITADO';
  }

  const ahora = Date.now();
  const inicio = new Date(fechaInicioIso).getTime();
  const fin = new Date(fechaFinIso).getTime();

  if (!isNaN(fin) && ahora > fin) {
    return 'FINALIZADO';
  }

  const veinticuatroHorasMs = 24 * 60 * 60 * 1000;
  if (!isNaN(inicio) && ahora < inicio - veinticuatroHorasMs) {
    return 'NO_DISPONIBLE_AUN';
  }

  return 'DISPONIBLE';
}

/**
 * Adaptador de compatibilidad para soportar la respuesta del backend actual
 * (que devuelve la lista simple de ExamenEstudiante) y la respuesta nueva de HU6.
 */
export function adaptarRespuestaExamenes(data: unknown): RespuestaExamenes {
  if (!data) {
    return { verificacionFotoActiva: false, examenes: [] };
  }

  // Caso 1: Estructura nueva { verificacionFotoActiva, examenes }
  if (typeof data === 'object' && 'examenes' in data && Array.isArray((data as { examenes: unknown }).examenes)) {
    const rawObj = data as { verificacionFotoActiva?: boolean; examenes: unknown[] };
    const examenesNuevos: Examen[] = [];

    for (const item of rawObj.examenes) {
      if (typeof item === 'object' && item !== null) {
        const rawItem = item as Record<string, unknown>;
        if (typeof rawItem.estadoQr === 'string') {
          // El servidor manda estadoQr: NUNCA se pisa ni recalcula
          examenesNuevos.push(item as Examen);
        } else {
          // El servidor no manda estadoQr: cálculo temporal
          examenesNuevos.push(adaptarExamenLegado(item as Partial<ExamenEstudiante>));
        }
      }
    }

    return {
      verificacionFotoActiva: Boolean(rawObj.verificacionFotoActiva),
      examenes: examenesNuevos,
    };
  }

  // Caso 2: Array directo (formato legado: ExamenEstudiante[])
  if (Array.isArray(data)) {
    return {
      verificacionFotoActiva: false,
      examenes: data.map((item) => {
        if (typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).estadoQr === 'string') {
          // Si el elemento ya trae estadoQr del servidor, se respeta estrictamente
          return item as Examen;
        }
        return adaptarExamenLegado(item as Partial<ExamenEstudiante>);
      }),
    };
  }

  return { verificacionFotoActiva: false, examenes: [] };
}

function adaptarExamenLegado(item: Partial<ExamenEstudiante>): Examen {
  const id = Number(item.id) || 0;
  const carrera = item.carrera || 'Carrera Universitaria';
  const nombre = item.nombre || 'Evaluación';
  const ambiente = item.ambiente || 'Ambiente por asignar';
  const fecha = item.fecha || new Date().toISOString().slice(0, 10);
  const horaInicio = item.horaInicio || '08:00';
  const horaFin = item.horaFin || '10:00';
  const habilitado = item.estado === 'Habilitado';

  const fechaInicio = `${fecha}T${horaInicio}:00`;
  const fechaFin = `${fecha}T${horaFin}:00`;

  const inicioDate = new Date(fechaInicio);
  const disponibleDesdeDate = isNaN(inicioDate.getTime())
    ? fechaInicio
    : new Date(inicioDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const estadoQrCalculado = calcularEstadoQrTemporal(habilitado, fechaInicio, fechaFin);

  return {
    id,
    carrera,
    nombre,
    ambiente,
    fechaInicio,
    fechaFin,
    habilitado,
    estadoQr: estadoQrCalculado,
    qrDisponibleDesde: disponibleDesdeDate,
    qrVigenteHasta: fechaFin,
    qrGenerado: false,
    facultad: item.facultad,
    esLegado: true,
  };
}
