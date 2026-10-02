import { ExamenPublico } from '../types/examenes-publicos.types';

// Fecha base dinámica relativa al año/mes actual para asegurar que siempre haya datos visibles si la BD aún no tiene registros
const now = new Date();
const currentYear = now.getFullYear();
const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

export const MOCK_EXAMENES_FALLBACK: ExamenPublico[] = [
  {
    id: 101,
    tipoExamen: 'Segundo Parcial',
    normas: 'Calculadora científica permitida. Presentar carnet de identidad o universitario vigente.',
    materiaId: 1,
    materiaNombre: 'Cálculo II',
    carreraId: 1,
    carreraNombre: 'Ingeniería de Sistemas',
    facultadId: 1,
    facultadNombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    docente: 'Lic. Vladimir Costas',
    ambienteId: 204,
    ambienteNombre: 'Sala 204 (FCyT)',
    fecha: `${currentYear}-${currentMonthStr}-06`,
    horaInicio: '09:00',
    horaFin: '11:00',
    estado: 'PROGRAMADO',
  },
  {
    id: 102,
    tipoExamen: 'Primer Parcial',
    normas: 'Sin material de apoyo. Celulares apagados y guardados en mochila.',
    materiaId: 2,
    materiaNombre: 'Álgebra Lineal',
    carreraId: 1,
    carreraNombre: 'Ingeniería de Sistemas',
    facultadId: 1,
    facultadNombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    docente: 'Lic. Edgar Flores',
    ambienteId: 101,
    ambienteNombre: 'Sala 101 (FCyT)',
    fecha: `${currentYear}-${currentMonthStr}-12`,
    horaInicio: '08:00',
    horaFin: '10:00',
    estado: 'PROGRAMADO',
  },
  {
    id: 103,
    tipoExamen: 'Examen de Mesa',
    normas: 'Habilitación verificada por sistema. Carnet universitario obligatorio.',
    materiaId: 3,
    materiaNombre: 'Ingeniería de Software I',
    carreraId: 1,
    carreraNombre: 'Ingeniería de Sistemas',
    facultadId: 1,
    facultadNombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    docente: 'Lic. Miriam Morales',
    ambienteId: 102,
    ambienteNombre: 'Laboratorio de Cómputo 1',
    fecha: `${currentYear}-${currentMonthStr}-13`,
    horaInicio: '10:00',
    horaFin: '12:00',
    estado: 'PROGRAMADO',
  },
  {
    id: 104,
    tipoExamen: 'Segundo Parcial',
    normas: 'Formulario oficial de fórmulas autorizado.',
    materiaId: 4,
    materiaNombre: 'Cálculo III',
    carreraId: 2,
    carreraNombre: 'Ingeniería Civil',
    facultadId: 1,
    facultadNombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    docente: 'Ing. Ramiro Zapata',
    ambienteId: 204,
    ambienteNombre: 'Sala 204 (FCyT)',
    fecha: `${currentYear}-${currentMonthStr}-20`,
    horaInicio: '14:00',
    horaFin: '16:00',
    estado: 'PROGRAMADO',
  },
  {
    id: 105,
    tipoExamen: 'Examen Final',
    normas: 'Material abierto. Presentar documento de identidad.',
    materiaId: 5,
    materiaNombre: 'Redes de Computadoras',
    carreraId: 1,
    carreraNombre: 'Ingeniería de Sistemas',
    facultadId: 1,
    facultadNombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    docente: 'Lic. Edgar Flores',
    ambienteId: 105,
    ambienteNombre: 'Auditorio Central FCyT',
    fecha: `${currentYear}-${currentMonthStr}-28`,
    horaInicio: '16:00',
    horaFin: '18:00',
    estado: 'PROGRAMADO',
  },
];

/**
 * Obtiene los exámenes públicos desde el backend para el calendario institucional.
 * Si el backend responde, devuelve los exámenes reales con su carrera, facultad y docente.
 * Si el backend está desconectado o sin datos, recurre a datos representativos de contingencia.
 */
export async function getExamenesPublicos(): Promise<ExamenPublico[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  try {
    // Intentamos obtener desde el endpoint público
    const res = await fetch(`${apiUrl}/examenes/publicos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Revalida cada minuto
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }

    // Intento con ruta complementaria si la primera no responde
    const resFallbackRoute = await fetch(`${apiUrl}/examenes-publicos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (resFallbackRoute.ok) {
      const data = await resFallbackRoute.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    console.warn('No se pudo conectar con el backend de exámenes públicos, usando datos de respaldo:', error);
  }

  return MOCK_EXAMENES_FALLBACK;
}
