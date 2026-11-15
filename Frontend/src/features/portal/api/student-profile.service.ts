import { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import {
  perfilEstudianteSchema,
  subirFotoResponseSchema,
  validarFoto,
  type CambioPasswordValues,
  type DatosPerfilValues,
  type PerfilErrorCode,
  type PerfilEstudiante,
  type SubirFotoResponse,
} from '../types/student-profile.types';

/* =============================================================================
   Endpoints asumidos (confirmar con Back):
   GET  /estudiantes/me/perfil           -> PerfilEstudiante
   PUT  /estudiantes/me/perfil           { ci, telefono } -> PerfilEstudiante
   POST /estudiantes/me/foto             multipart "foto" -> { fotoUrl }
   POST /estudiantes/me/cambiar-password { passwordActual, passwordNueva }

   IMPORTANTE: una contraseña actual incorrecta debe responder 400 o 422, NO 401.
   El apiClient trata todo 401 como sesión vencida y cierra la sesión.
   ============================================================================= */

/** Error del perfil con un código que la UI sabe traducir a un mensaje. */
export class PerfilError extends Error {
  readonly code: PerfilErrorCode;
  constructor(code: PerfilErrorCode) {
    super(code);
    this.name = 'PerfilError';
    this.code = code;
  }
}

type Contexto = 'perfil' | 'foto' | 'password';

function traducirError(error: unknown, contexto: Contexto): PerfilError {
  if (error instanceof PerfilError) return error;
  if (isAxiosError(error)) {
    if (!error.response) return new PerfilError('NETWORK_ERROR');
    const status = error.response.status;
    if (contexto === 'password' && (status === 400 || status === 422)) {
      return new PerfilError('PASSWORD_ACTUAL_INCORRECTA');
    }
    if (contexto === 'foto' && [400, 413, 415, 422].includes(status)) {
      return new PerfilError('FOTO_INVALIDA');
    }
  }
  return new PerfilError('SERVER_ERROR');
}

/* ---------- API ---------- */

export async function getMiPerfil(): Promise<PerfilEstudiante> {
  try {
    const { data } = await apiClient.get('/estudiantes/me/perfil');
    return perfilEstudianteSchema.parse(data);
  } catch (error) {
    throw traducirError(error, 'perfil');
  }
}

export async function guardarDatosPerfil(values: DatosPerfilValues): Promise<PerfilEstudiante> {
  try {
    const { data } = await apiClient.put('/estudiantes/me/perfil', values);
    return perfilEstudianteSchema.parse(data);
  } catch (error) {
    throw traducirError(error, 'perfil');
  }
}

export async function subirFotoPerfil(file: File): Promise<SubirFotoResponse> {
  if (validarFoto(file)) throw new PerfilError('FOTO_INVALIDA');

  try {
    const form = new FormData();
    form.append('foto', file);
    const { data } = await apiClient.post('/estudiantes/me/foto', form);
    return subirFotoResponseSchema.parse(data);
  } catch (error) {
    throw traducirError(error, 'foto');
  }
}

export async function cambiarPassword(values: CambioPasswordValues): Promise<void> {
  try {
    await apiClient.post('/estudiantes/me/cambiar-password', {
      passwordActual: values.passwordActual,
      passwordNueva: values.passwordNueva,
    });
  } catch (error) {
    throw traducirError(error, 'password');
  }
}