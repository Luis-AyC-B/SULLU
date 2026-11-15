import { apiClient } from '@/shared/lib/api-client';
import { adaptarRespuestaExamenes } from '../lib/adaptador-examenes';
import {
  type ExamenEstudiante,
  type StudentProfile,
  type FotoEstudianteItem,
  type SubirFotoResponse,
} from '../types/student-exam.types';

/* ---------- Endpoints ---------- */

/** GET /estudiantes/me/examenes — lista de exámenes habilitados para el estudiante */
export async function getMisExamenes(): Promise<ExamenEstudiante[]> {

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

  const { data } = await apiClient.get<StudentProfile>('/estudiantes/me/perfil');
  return data;
}

/** PATCH /estudiantes/me/perfil — actualiza teléfono */
export async function actualizarMiPerfil(dto: { telefono?: string }): Promise<StudentProfile> {

  const { data } = await apiClient.patch<StudentProfile>('/estudiantes/me/perfil', dto);
  return data;
}

/** POST /estudiantes/me/foto — sube o captura foto de perfil */
export async function subirMiFoto(archivo: File | Blob): Promise<SubirFotoResponse> {

  const formData = new FormData();
  formData.append('foto', archivo, 'perfil.jpg');

  const { data } = await apiClient.post<SubirFotoResponse>('/estudiantes/me/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** GET /estudiantes/me/fotos — obtiene el historial de fotos subidas */
export async function getHistorialFotos(): Promise<FotoEstudianteItem[]> {

  const { data } = await apiClient.get<FotoEstudianteItem[]>('/estudiantes/me/fotos');
  return data;
}

/** PATCH /estudiantes/me/password — actualiza contraseña inicial o voluntaria */
export async function cambiarMiPassword(dto: {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}): Promise<{ message: string; debeCambiarPassword: boolean }> {

  const { data } = await apiClient.patch<{ message: string; debeCambiarPassword: boolean }>(
    '/estudiantes/me/password',
    dto,
  );
  return data;
}
