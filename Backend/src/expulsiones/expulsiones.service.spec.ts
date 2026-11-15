import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CasoIncidencia, EstadoExamen, Prisma } from '@prisma/client';
import { ExpulsionesService } from './expulsiones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExpulsionesService', () => {
  let service: ExpulsionesService;
  let prismaMock: {
    examen: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    estudiante: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    ingreso: {
      findMany: jest.Mock;
    };
    expulsion: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    bitacora_Auditoria: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const docenteId = 42;
  const examenId = 19;
  const fechaFijaPrueba = new Date('2026-11-08T20:30:00.000Z');

  const mockExamenValido = {
    id: examenId,
    usuarioId: docenteId,
    estado: EstadoExamen.EN_CURSO,
    reservaAmbiente: {
      fecha: new Date('2026-11-08T00:00:00.000Z'),
      horarioFijo: {
        // En combinarBolivia se suma OFFSET_BOLIVIA_HORAS (+4) a UTC hours:
        // horaIni: 16:00 UTC + 4 = 20:00 UTC (16:00 Bolivia)
        // horaFin: 18:00 UTC + 4 = 22:00 UTC (18:00 Bolivia)
        horaIni: new Date(Date.UTC(1970, 0, 1, 16, 0, 0)),
        horaFin: new Date(Date.UTC(1970, 0, 1, 18, 0, 0)),
      },
    },
  };

  const mockEstudianteJuan = {
    id: 57,
    cod_sis: '202201234',
    nombre: 'Juan',
    apellido: 'Pérez López',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(fechaFijaPrueba);

    prismaMock = {
      examen: {
        findUnique: jest.fn().mockResolvedValue(mockExamenValido),
        findMany: jest.fn().mockResolvedValue([]),
      },
      estudiante: {
        findUnique: jest.fn().mockResolvedValue(mockEstudianteJuan),
        findMany: jest.fn().mockResolvedValue([mockEstudianteJuan]),
      },
      ingreso: {
        findMany: jest.fn().mockResolvedValue([{ estudianteId: 57 }]),
      },
      expulsion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      bitacora_Auditoria: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
      $transaction: jest.fn(async (cbOrArray) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(prismaMock);
        }
        return Promise.all(cbOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpulsionesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ExpulsionesService>(ExpulsionesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Búsqueda de estudiantes elegibles (estudiantesElegibles)', () => {
    it.each([['2022'], ['202201234'], ['juan perez'], ['perez']])(
      'encuentra a Juan Pérez López con la consulta "%s"',
      async (query) => {
        const resultados = await service.estudiantesElegibles(
          examenId,
          docenteId,
          query,
        );
        expect(resultados).toHaveLength(1);
        expect(resultados[0]).toEqual({
          codigoSis: '202201234',
          nombre: 'Juan Pérez López',
        });
      },
    );

    it('devuelve los primeros 5 cuando q está vacío', async () => {
      const estudiantes = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        cod_sis: `20220000${i}`,
        nombre: `Estudiante ${i}`,
        apellido: 'Test',
      }));
      prismaMock.ingreso.findMany.mockResolvedValue(
        estudiantes.map((e) => ({ estudianteId: e.id })),
      );
      prismaMock.estudiante.findMany.mockResolvedValue(estudiantes);

      const resultados = await service.estudiantesElegibles(
        examenId,
        docenteId,
        '',
      );
      expect(resultados).toHaveLength(5);
    });
  });

  describe('Creación de expulsión (crear)', () => {
    it('lanza BadRequestException (400) con code EXAMEN_NO_EN_CURSO si el examen finalizó o no inició', async () => {
      prismaMock.examen.findUnique.mockResolvedValue({
        ...mockExamenValido,
        reservaAmbiente: {
          fecha: new Date('2020-01-01T00:00:00.000Z'),
          horarioFijo: {
            horaIni: new Date(Date.UTC(1970, 0, 1, 8, 0)),
            horaFin: new Date(Date.UTC(1970, 0, 1, 10, 0)),
          },
        },
      });

      await expect(
        service.crear(
          {
            examenId: String(examenId),
            codigoSis: '202201234',
            motivo: 'USO_CELULAR',
          },
          docenteId,
        ),
      ).rejects.toMatchObject({
        response: { code: 'EXAMEN_NO_EN_CURSO' },
      });
    });

    it('lanza BadRequestException (400) con code ESTUDIANTE_SIN_INGRESO si el estudiante no ingresó', async () => {
      prismaMock.ingreso.findMany.mockResolvedValue([]); // Nadie ha ingresado

      await expect(
        service.crear(
          {
            examenId: String(examenId),
            codigoSis: '202201234',
            motivo: 'USO_CELULAR',
          },
          docenteId,
        ),
      ).rejects.toMatchObject({
        response: { code: 'ESTUDIANTE_SIN_INGRESO' },
      });
    });

    it('lanza ConflictException (409) con code ESTUDIANTE_YA_EXPULSADO si ya existe un registro', async () => {
      const errorP2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );
      prismaMock.expulsion.create.mockRejectedValue(errorP2002);

      await expect(
        service.crear(
          {
            examenId: String(examenId),
            codigoSis: '202201234',
            motivo: 'USO_CELULAR',
          },
          docenteId,
        ),
      ).rejects.toMatchObject({
        response: { code: 'ESTUDIANTE_YA_EXPULSADO' },
      });
    });

    it('guarda detalle vacío y caso por defecto EXPULSION si no se especifican', async () => {
      const expulsionCreada = {
        id: 101,
        examenId,
        estudianteId: 57,
        docenteId,
        caso: CasoIncidencia.EXPULSION,
        motivo: 'USO_CELULAR',
        detalle: '',
        fechaHora: new Date('2026-11-08T20:30:00Z'),
        estudiante: mockEstudianteJuan,
        docente: { nombre: 'Vladimir', apellido: 'Costas' },
      };
      prismaMock.expulsion.create.mockResolvedValue(expulsionCreada);

      const resultado = await service.crear(
        {
          examenId: String(examenId),
          codigoSis: '202201234',
          motivo: 'USO_CELULAR',
        },
        docenteId,
      );

      expect(prismaMock.expulsion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caso: CasoIncidencia.EXPULSION,
            detalle: '',
          }),
        }),
      );

      expect(resultado.caso).toBe('EXPULSION');
      expect(resultado.detalle).toBe('');
      expect(resultado.estudianteNombre).toBe('Juan Pérez López');
    });

    it('registra correctamente con caso SUPLANTACION_IDENTIDAD y detalle vacío', async () => {
      const expulsionCreada = {
        id: 102,
        examenId,
        estudianteId: 57,
        docenteId,
        caso: CasoIncidencia.SUPLANTACION_IDENTIDAD,
        motivo: 'USO_CELULAR',
        detalle: '',
        fechaHora: new Date('2026-11-08T20:30:00Z'),
        estudiante: mockEstudianteJuan,
        docente: { nombre: 'Vladimir', apellido: 'Costas' },
      };
      prismaMock.expulsion.create.mockResolvedValue(expulsionCreada);

      const resultado = await service.crear(
        {
          examenId: String(examenId),
          codigoSis: '202201234',
          caso: CasoIncidencia.SUPLANTACION_IDENTIDAD,
          motivo: 'USO_CELULAR',
          detalle: '',
        },
        docenteId,
      );

      expect(prismaMock.expulsion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caso: CasoIncidencia.SUPLANTACION_IDENTIDAD,
            motivo: 'USO_CELULAR',
            detalle: '',
          }),
        }),
      );

      expect(resultado.caso).toBe('SUPLANTACION_IDENTIDAD');
      expect(resultado.detalle).toBe('');
      expect(resultado.estudianteNombre).toBe('Juan Pérez López');
    });
  });

  describe('Bloqueo de reingreso (verificarBloqueoReingreso)', () => {
    it('lanza ForbiddenException si el estudiante tiene caso EXPULSION', async () => {
      prismaMock.expulsion.findFirst.mockResolvedValue({
        id: 1,
        caso: CasoIncidencia.EXPULSION,
      });

      await expect(
        service.verificarBloqueoReingreso(examenId, 57),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si el estudiante tiene caso SUPLANTACION_IDENTIDAD', async () => {
      prismaMock.expulsion.findFirst.mockResolvedValue({
        id: 2,
        caso: CasoIncidencia.SUPLANTACION_IDENTIDAD,
      });

      await expect(
        service.verificarBloqueoReingreso(examenId, 57),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no lanza excepción si el estudiante no tiene incidencias de expulsión', async () => {
      prismaMock.expulsion.findFirst.mockResolvedValue(null);

      await expect(
        service.verificarBloqueoReingreso(examenId, 57),
      ).resolves.toBeUndefined();
    });
  });
});
