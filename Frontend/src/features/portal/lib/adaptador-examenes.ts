import type { Examen, RespuestaExamenes } from '../types/qr-examen';
import type { ExamenEstudiante } from '../types/student-exam.types';

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
      if (typeof item === 'object' && item !== null && 'estadoQr' in item) {
        examenesNuevos.push(item as Examen);
      } else {
        examenesNuevos.push(adaptarExamenLegado(item as Partial<ExamenEstudiante>));
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
      examenes: data.map((item) => adaptarExamenLegado(item as Partial<ExamenEstudiante>)),
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

  return {
    id,
    carrera,
    nombre,
    ambiente,
    fechaInicio,
    fechaFin,
    habilitado,
    estadoQr: habilitado ? 'DISPONIBLE' : 'INHABILITADO',
    qrDisponibleDesde: fechaInicio,
    qrVigenteHasta: fechaFin,
    qrGenerado: false,
    facultad: item.facultad,
    esLegado: true,
  };
}
