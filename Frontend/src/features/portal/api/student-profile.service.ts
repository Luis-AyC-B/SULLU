import { isAxiosError } from 'axios';
import { getSession } from 'next-auth/react';
import { apiClient } from '@/shared/lib/api-client';
import { MOCK_TOKEN_PREFIX } from '../types/student-exam.types';
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

/* ---------- Mocks (mientras el backend no esté listo) ---------- */

const MOCK_PASSWORD_INICIAL = 'estudiante123';

/** Foto de prueba embebida (avatar con iniciales), para no depender de archivos del proyecto. */
const MOCK_FOTO_LUIS =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#003770"/>' +
      '<text x="100" y="125" font-size="80" text-anchor="middle" fill="#fff" font-family="Arial">LQ</text></svg>',
  );

interface MockEstado {
  perfil: PerfilEstudiante;
  password: string;
  passwordCambiada: boolean;
}

/** Estado en memoria por estudiante de prueba: se reinicia al recargar la página. */
const MOCK_ESTADOS = new Map<string, MockEstado>();

function crearEstadoInicial(token: string): MockEstado {
  if (token.endsWith('-empty')) {
    // Luis: ya completó su perfil
    return {
      perfil: { nombre: 'Luis Quispe Vargas', sis: '201900124', ci: '9234567', telefono: '71234567', fotoUrl: MOCK_FOTO_LUIS, perfilCompleto: true },
      password: MOCK_PASSWORD_INICIAL,
      passwordCambiada: true,
    };
  }
  const base = token.endsWith('-error')
    ? { nombre: 'Marta Flores Rojas', sis: '201900125' }
    : { nombre: 'Ana Rojas Mamani', sis: '201900123' };
  return {
    perfil: { ...base, ci: null, telefono: null, fotoUrl: null, perfilCompleto: false },
    password: MOCK_PASSWORD_INICIAL,
    passwordCambiada: false,
  };
}

function estadoMock(token: string): MockEstado {
  let estado = MOCK_ESTADOS.get(token);
  if (!estado) {
    estado = crearEstadoInicial(token);
    MOCK_ESTADOS.set(token, estado);
  }
  return estado;
}

/** El perfil queda completo cuando tiene foto, datos extra y la contraseña ya fue cambiada. */
function recalcular(estado: MockEstado): PerfilEstudiante {
  const p = estado.perfil;
  p.perfilCompleto = Boolean(p.ci && p.telefono && p.fotoUrl && estado.passwordCambiada);
  return { ...p };
}

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function getMockToken(): Promise<string | null> {
  const session = await getSession();
  const token = session?.user?.accessToken;
  return token?.startsWith(MOCK_TOKEN_PREFIX) ? token : null;
}

/** Marta (-error) simula caída de red en todas las operaciones del perfil. */
function simularRed(token: string) {
  if (token.endsWith('-error')) throw new PerfilError('NETWORK_ERROR');
}

/* ---------- API ---------- */

export async function getMiPerfil(): Promise<PerfilEstudiante> {
  const mock = await getMockToken();
  if (mock) {
    await wait();
    simularRed(mock);
    return recalcular(estadoMock(mock));
  }
  try {
    const { data } = await apiClient.get('/estudiantes/me/perfil');
    return perfilEstudianteSchema.parse(data);
  } catch (error) {
    throw traducirError(error, 'perfil');
  }
}

export async function guardarDatosPerfil(values: DatosPerfilValues): Promise<PerfilEstudiante> {
  const mock = await getMockToken();
  if (mock) {
    await wait();
    simularRed(mock);
    const estado = estadoMock(mock);
    estado.perfil.ci = values.ci;
    estado.perfil.telefono = values.telefono;
    return recalcular(estado);
  }
  try {
    const { data } = await apiClient.put('/estudiantes/me/perfil', values);
    return perfilEstudianteSchema.parse(data);
  } catch (error) {
    throw traducirError(error, 'perfil');
  }
}

export async function subirFotoPerfil(file: File): Promise<SubirFotoResponse> {
  if (validarFoto(file)) throw new PerfilError('FOTO_INVALIDA');

  const mock = await getMockToken();
  if (mock) {
    await wait(600);
    simularRed(mock);
    const fotoUrl = URL.createObjectURL(file);
    estadoMock(mock).perfil.fotoUrl = fotoUrl;
    return { fotoUrl };
  }
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
  const mock = await getMockToken();
  if (mock) {
    await wait();
    simularRed(mock);
    const estado = estadoMock(mock);
    if (values.passwordActual !== estado.password) {
      throw new PerfilError('PASSWORD_ACTUAL_INCORRECTA');
    }
    estado.password = values.passwordNueva;
    estado.passwordCambiada = true;
    return;
  }
  try {
    await apiClient.post('/estudiantes/me/cambiar-password', {
      passwordActual: values.passwordActual,
      passwordNueva: values.passwordNueva,
    });
  } catch (error) {
    throw traducirError(error, 'password');
  }
}