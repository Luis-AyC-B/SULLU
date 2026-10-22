import { getSession } from 'next-auth/react';
import { apiClient } from '@/shared/lib/api-client';
import { adaptarRespuestaExamenes } from '../lib/adaptador-examenes';
import {
  MOCK_TOKEN_PREFIX,
  type ExamenEstudiante,
  type StudentProfile,
  type FotoEstudianteItem,
  type SubirFotoResponse,
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

const MOCK_PERFIL: StudentProfile = {
  id: 1,
  cod_sis: '201900123',
  ci: '8123456',
  nombre: 'Ana',
  apellido: 'Rojas Mamani',
  correo: '201900123@est.umss.edu.bo',
  telefono: '71234567',
  fotoUrl: null,
  perfilCompleto: false,
  debeCambiarPassword: false,
};

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function getMockToken(): Promise<string | null> {
  const session = await getSession();
  const token = session?.user?.accessToken;
  return token?.startsWith(MOCK_TOKEN_PREFIX) ? token : null;
}

/* ---------- Endpoints ---------- */

/** GET /estudiantes/me/examenes — lista de exámenes habilitados para el estudiante */
export async function getMisExamenes(): Promise<ExamenEstudiante[]> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait();
    if (mockToken.endsWith('-error')) throw new Error('NETWORK_ERROR');
    if (mockToken.endsWith('-empty')) return [];
    return MOCK_EXAMENES;
  }

  const { data } = await apiClient.get('/estudiantes/me/examenes');
  const adaptada = adaptarRespuestaExamenes(data);
  return adaptada.examenes.map((e) => {
    const fecha = e.fechaInicio ? e.fechaInicio.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const horaInicio = e.fechaInicio && e.fechaInicio.includes('T') ? e.fechaInicio.split('T')[1].slice(0, 5) : '08:00';
    const horaFin = e.fechaFin && e.fechaFin.includes('T') ? e.fechaFin.split('T')[1].slice(0, 5) : '10:00';
    return {
      id: e.id,
      carrera: e.carrera,
      nombre: e.nombre,
      ambiente: e.ambiente,
      facultad: e.facultad || 'FCyT',
      fecha,
      horaInicio,
      horaFin,
      estado: e.habilitado ? 'Habilitado' : 'Inhabilitado',
    };
  });
}

/** GET /estudiantes/me/perfil — obtiene datos completos del estudiante autenticado */
export async function getMiPerfil(): Promise<StudentProfile> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(250);
    return MOCK_PERFIL;
  }

  const { data } = await apiClient.get<StudentProfile>('/estudiantes/me/perfil');
  return data;
}

/** PATCH /estudiantes/me/perfil — actualiza teléfono */
export async function actualizarMiPerfil(dto: { telefono?: string }): Promise<StudentProfile> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(300);
    return { ...MOCK_PERFIL, telefono: dto.telefono || MOCK_PERFIL.telefono };
  }

  const { data } = await apiClient.patch<StudentProfile>('/estudiantes/me/perfil', dto);
  return data;
}

/** POST /estudiantes/me/foto — sube o captura foto de perfil */
export async function subirMiFoto(archivo: File | Blob): Promise<SubirFotoResponse> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(500);
    return {
      message: 'Foto procesada correctamente (simulación)',
      fotoUrl: '/uploads/estudiantes/foto-simulada.jpg',
      estado: 'ACTIVA',
      perfilCompleto: true,
    };
  }

  const formData = new FormData();
  formData.append('foto', archivo, 'perfil.jpg');

  const { data } = await apiClient.post<SubirFotoResponse>('/estudiantes/me/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** GET /estudiantes/me/fotos — obtiene el historial de fotos subidas */
export async function getHistorialFotos(): Promise<FotoEstudianteItem[]> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(250);
    return [
      {
        id: 1,
        archivo: '/uploads/estudiantes/foto-1.jpg',
        estado: 'ACTIVA',
        similitud: 1.0,
        creadaEn: new Date().toISOString(),
      },
    ];
  }

  const { data } = await apiClient.get<FotoEstudianteItem[]>('/estudiantes/me/fotos');
  return data;
}

/** PATCH /estudiantes/me/password — actualiza contraseña inicial o voluntaria */
export async function cambiarMiPassword(dto: {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}): Promise<{ message: string; debeCambiarPassword: boolean }> {
  const mockToken = await getMockToken();
  if (mockToken) {
    await wait(300);
    return { message: 'Contraseña actualizada (simulación)', debeCambiarPassword: false };
  }

  const { data } = await apiClient.patch<{ message: string; debeCambiarPassword: boolean }>(
    '/estudiantes/me/password',
    dto,
  );
  return data;
}
