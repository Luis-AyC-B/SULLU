import CredentialsProvider from 'next-auth/providers/credentials';
import { MOCK_TOKEN_PREFIX, studentLoginResponseSchema } from '../types/student-exam.types';

const PERMISOS_ESTUDIANTE = ['portal_estudiante'];

const MOCK_ESTUDIANTES = [
  { sis: '201900123', ci: '8123456', id: 101, name: 'Ana Rojas Mamani', token: `${MOCK_TOKEN_PREFIX}-ana` },
  // Sin exámenes habilitados
  { sis: '201900124', ci: '9234567', id: 102, name: 'Luis Quispe Vargas', token: `${MOCK_TOKEN_PREFIX}-empty` },
  // Simula caída de red al cargar la lista
  { sis: '201900125', ci: '7345678', id: 103, name: 'Marta Flores Rojas', token: `${MOCK_TOKEN_PREFIX}-error` },
];

export const studentCredentialsProvider = CredentialsProvider({
  id: 'student-credentials',
  name: 'Estudiante',
  credentials: {
    sis: { label: 'Código SIS', type: 'text' },
    ci: { label: 'CI', type: 'text' },
  },
  async authorize(credentials) {
    const sis = credentials?.sis?.trim() ?? '';
    const ci = credentials?.ci?.trim() ?? '';
    if (!sis || !ci) throw new Error('INVALID_CREDENTIALS');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/estudiante/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sis, ci }),
      });

      // El endpoint aún no existe en el backend: cae al fallback de mocks
      if (res.status === 404) throw new Error('ENDPOINT_NOT_AVAILABLE');
      if (res.status === 429 || res.status === 423) throw new Error('ACCOUNT_LOCKED');
      if (!res.ok) throw new Error('INVALID_CREDENTIALS');

      const data = studentLoginResponseSchema.parse(await res.json());
      return {
        id: String(data.estudiante.id),
        name: data.estudiante.nombre,
        permisos: PERMISOS_ESTUDIANTE,
        accessToken: data.access_token,
      };
    } catch (error) {
      if (error instanceof Error && ['ACCOUNT_LOCKED', 'INVALID_CREDENTIALS'].includes(error.message)) {
        throw error;
      }

      // Fallback de desarrollo: backend no disponible
      const mock = MOCK_ESTUDIANTES.find((e) => e.sis === sis && e.ci === ci);
      if (mock) {
        return {
          id: String(mock.id),
          name: mock.name,
          permisos: PERMISOS_ESTUDIANTE,
          accessToken: mock.token,
        };
      }
      throw new Error('INVALID_CREDENTIALS');
    }
  },
});