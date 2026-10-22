import { getMisExamenes } from '../api/student-exam.service';
import { apiClient } from '@/shared/lib/api-client';

jest.mock('@/shared/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock('next-auth/react', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}));

describe('Conexión del Adaptador a student-exam.service.ts', () => {
  const mockGet = apiClient.get as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe procesar la respuesta del backend actual (legado) sin errores', async () => {
    const respuestaLegada = [
      {
        id: 1,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Cálculo II',
        ambiente: 'Aula 203',
        facultad: 'FCyT',
        fecha: '2026-10-25',
        horaInicio: '08:00',
        horaFin: '10:00',
        estado: 'Habilitado',
      },
    ];

    mockGet.mockResolvedValueOnce({ data: respuestaLegada });

    const examenes = await getMisExamenes();
    expect(examenes).toHaveLength(1);
    expect(examenes[0]).toEqual({
      id: 1,
      carrera: 'Ingeniería de Sistemas',
      nombre: 'Cálculo II',
      ambiente: 'Aula 203',
      facultad: 'FCyT',
      fecha: '2026-10-25',
      horaInicio: '08:00',
      horaFin: '10:00',
      estado: 'Habilitado',
    });
  });

  it('debe procesar la respuesta nueva { verificacionFotoActiva, examenes } y devolver ExamenEstudiante[] compatible', async () => {
    const respuestaNueva = {
      verificacionFotoActiva: true,
      examenes: [
        {
          id: 5,
          carrera: 'Informática',
          nombre: 'Sistemas Operativos',
          ambiente: 'Lab 2',
          fechaInicio: '2026-10-28T14:00:00Z',
          fechaFin: '2026-10-28T16:00:00Z',
          habilitado: true,
          estadoQr: 'DISPONIBLE',
          qrDisponibleDesde: '2026-10-27T14:00:00Z',
          qrVigenteHasta: '2026-10-28T16:00:00Z',
          qrGenerado: false,
        },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: respuestaNueva });

    const examenes = await getMisExamenes();
    expect(examenes).toHaveLength(1);
    expect(examenes[0].id).toBe(5);
    expect(examenes[0].nombre).toBe('Sistemas Operativos');
    expect(examenes[0].fecha).toBe('2026-10-28');
    expect(examenes[0].horaInicio).toBe('14:00');
    expect(examenes[0].horaFin).toBe('16:00');
    expect(examenes[0].estado).toBe('Habilitado');
  });
});

