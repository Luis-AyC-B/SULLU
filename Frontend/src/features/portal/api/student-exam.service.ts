import { getSession } from 'next-auth/react';
import { apiClient } from '@/shared/lib/api-client';
import {
  MOCK_TOKEN_PREFIX,
  examenesEstudianteSchema,
  studentQrPayloadSchema,
  type ExamenEstudiante,
  type StudentQrPayload,
} from '../types/student-exam.types';

/* ---------- Mocks (mientras el backend no esté listo) ---------- */

const MOCK_EXAMENES: ExamenEstudiante[] = [
  {
    id: 1,
    carrera: 'Ingeniería de Sistemas',
    nombre: 'Cálculo II – Examen Final',
    ambiente: 'Aula 203',
    facultad: 'FCyT',
    fecha: '2026-09-06',
    horaInicio: '09:00',
    horaFin: '11:00',
    estado: 'Habilitado',
  },
  {
    id: 2,
    carrera: 'Ingeniería de Sistemas',
    nombre: 'Redes de Computadoras – Primer parcial',
    ambiente: 'Laboratorio Informática 2',
    facultad: 'FCyT',
    fecha: '2026-09-10',
    horaInicio: '14:00',
    horaFin: '16:00',
    estado: 'Habilitado',
  },
  {
    id: 3,
    carrera: 'Ingeniería de Sistemas',
    nombre: 'Administración II – Examen final',
    ambiente: 'Aula 101',
    facultad: 'FCE',
    fecha: '2026-09-14',
    horaInicio: '08:00',
    horaFin: '10:00',
    estado: 'Habilitado',
  },
];

const MOCK_QR: StudentQrPayload = {
  nombre: 'Ana Rojas Mamani',
  sis: '201900123',
  ci: '8123456',
  token: 'mock.eyJzaXMiOiIyMDE5MDAxMjMifQ.firma-simulada',
};

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

async function getMockToken(): Promise<string | null> {
  const session = await getSession();
  const token = session?.user?.accessToken;
  return token?.startsWith(MOCK_TOKEN_PREFIX) ? token : null;
}

/* ---------- Endpoints ---------- */

/** GET /estudiantes/me/examenes — el backend ya devuelve solo los del estudiante autenticado */
export async function getMisExamenes(): Promise<ExamenEstudiante[]> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait();
    if (mockToken.endsWith('-error')) throw new Error('NETWORK_ERROR');
    if (mockToken.endsWith('-empty')) return [];
    return MOCK_EXAMENES;
  }

  const { data } = await apiClient.get('/estudiantes/me/examenes');
  return examenesEstudianteSchema.parse(data);
}

/** GET /estudiantes/me/qr */
export async function getMiQr(): Promise<StudentQrPayload> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(300);
    if (mockToken.endsWith('-empty')) {
      return { ...MOCK_QR, nombre: 'Luis Quispe Vargas', sis: '201900124', ci: '9234567' };
    }
    if (mockToken.endsWith('-error')) {
      return { ...MOCK_QR, nombre: 'Marta Flores Rojas', sis: '201900125', ci: '7345678' };
    }
    return MOCK_QR;
  }

  const { data } = await apiClient.get('/estudiantes/me/qr');
  return studentQrPayloadSchema.parse(data);
}