import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoExamen } from '@prisma/client';
import { ExamenesService } from './examenes.service';

describe('HU16: Dashboard de asistencia en tiempo real (Exámenes)', () => {
  let service: ExamenesService;
  let prismaMock: Record<string, any>;

  const mockExamenBase = {
    id: 1,
    usuarioId: 10,
    tipoExamen: 'Segundo parcial',
    estado: EstadoExamen.PROGRAMADO,
    reservaAmbiente: {
      fecha: new Date('2026-10-30T00:00:00.000Z'),
      ambiente: { nombre: 'Aula B-201 (FCyT)' },
      horarioFijo: {
        horaIni: new Date('1970-01-01T08:00:00.000Z'),
        horaFin: new Date('1970-01-01T23:59:00.000Z'),
      },
    },
    responsable: {
      id: 10,
      nombre: 'Vladimir',
      apellido: 'Costas Cuba',
    },
    carrerasMaterias: [
      {
        carrera_materia: {
          materia: { nombre: 'Sistemas Operativos' },
          carrera: {
            nombre: 'Ingeniería de Sistemas',
            facultad: { nombre: 'Facultad de Ciencias y Tecnología' },
          },
        },
      },
    ],
  };

  beforeEach(() => {
    prismaMock = {
      examen: {
        findUnique: jest.fn(),
      },
      examen_Estudiante: {
        count: jest.fn(),
      },
      ingreso: {
        count: jest.fn(),
      },
    };
    service = new ExamenesService(prismaMock);
  });

  describe('EP1: Asistencia de un examen en curso', () => {
    it('debe retornar 10 habilitados, 7 presentes, 3 ausentes y porcentajes redondeados', async () => {
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenBase,
        estado: EstadoExamen.EN_CURSO,
      });

      // 10 habilitados, 7 con ingreso registrado
      prismaMock.examen_Estudiante.count
        .mockResolvedValueOnce(10) // habilitados
        .mockResolvedValueOnce(7); // presentes con ingreso

      const res = await service.getDashboardAsistencia(1, 10, false);

      expect(res.examenId).toBe(1);
      expect(res.materia).toBe('Sistemas Operativos');
      expect(res.habilitados).toBe(10);
      expect(res.presentes).toBe(7);
      expect(res.ausentes).toBe(3);
      expect(res.porcentajePresentes).toBe(70);
      expect(res.porcentajeAusentes).toBe(30);
      expect(res.examenAunNoInicia).toBe(false);
      expect(res.habilitados).toBe(res.presentes + (res.ausentes ?? 0));
    });
  });

  describe('EP4: Examen programado que aún no inicia', () => {
    it('debe indicar examenAunNoInicia: true y ausentes: null para no penalizar a quien aún no debe llegar', async () => {
      // Examen programado para el año 2030 (futuro)
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenBase,
        estado: EstadoExamen.PROGRAMADO,
        reservaAmbiente: {
          ...mockExamenBase.reservaAmbiente,
          fecha: new Date('2030-01-01T00:00:00.000Z'),
        },
      });

      prismaMock.examen_Estudiante.count
        .mockResolvedValueOnce(15) // habilitados
        .mockResolvedValueOnce(0); // presentes

      const res = await service.getDashboardAsistencia(1, 10, false);

      expect(res.estado).toBe('PROXIMO');
      expect(res.habilitados).toBe(15);
      expect(res.presentes).toBe(0);
      expect(res.ausentes).toBeNull();
      expect(res.porcentajePresentes).toBe(0);
      expect(res.porcentajeAusentes).toBe(0);
      expect(res.examenAunNoInicia).toBe(true);
    });
  });

  describe('EP3: Examen finalizado', () => {
    it('debe entregar las cifras finales con estado FINALIZADO', async () => {
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenBase,
        estado: EstadoExamen.FINALIZADO,
      });

      prismaMock.examen_Estudiante.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(18);

      const res = await service.getDashboardAsistencia(1, 10, false);

      expect(res.estado).toBe('FINALIZADO');
      expect(res.habilitados).toBe(20);
      expect(res.presentes).toBe(18);
      expect(res.ausentes).toBe(2);
      expect(res.porcentajePresentes).toBe(90);
      expect(res.porcentajeAusentes).toBe(10);
      expect(res.examenAunNoInicia).toBe(false);
    });
  });

  describe('EN1: Examen con 0 habilitados', () => {
    it('debe manejar 0 habilitados entregando porcentajes 0% sin división por cero ni NaN', async () => {
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenBase,
        estado: EstadoExamen.EN_CURSO,
      });

      prismaMock.examen_Estudiante.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const res = await service.getDashboardAsistencia(1, 10, false);

      expect(res.habilitados).toBe(0);
      expect(res.presentes).toBe(0);
      expect(res.ausentes).toBe(0);
      expect(res.porcentajePresentes).toBe(0);
      expect(res.porcentajeAusentes).toBe(0);
      expect(Number.isNaN(res.porcentajePresentes)).toBe(false);
      expect(Number.isNaN(res.porcentajeAusentes)).toBe(false);
    });
  });

  describe('EN3: Control de acceso por rol y propiedad', () => {
    it('debe lanzar ForbiddenException si el usuario no es el docente responsable ni admin', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenBase);

      await expect(
        service.getDashboardAsistencia(1, 999, false), // usuario 999 no es docenteId 10
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir la consulta si el usuario es administrador aunque no sea el docente responsable', async () => {
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenBase,
        estado: EstadoExamen.EN_CURSO,
      });
      prismaMock.examen_Estudiante.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      const res = await service.getDashboardAsistencia(1, 999, true); // isAdmin = true
      expect(res.examenId).toBe(1);
      expect(res.habilitados).toBe(5);
    });

    it('debe lanzar NotFoundException si el examen no existe', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(null);

      await expect(
        service.getDashboardAsistencia(999, 10, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
