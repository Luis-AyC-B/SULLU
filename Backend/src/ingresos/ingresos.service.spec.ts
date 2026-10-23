import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngresosService } from './ingresos.service';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoExamen, TipoIncidencia } from '@prisma/client';

describe('UT01-HU09: Validar la lógica de negocio y excepciones de validación de código QR', () => {
  let service: IngresosService;
  let prismaMock: {
    examen: { findUnique: jest.Mock };
    codigoQr: { findUnique: jest.Mock };
    examen_Estudiante: { findUnique: jest.Mock };
    ingreso: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    incidenciaIngreso: { create: jest.Mock };
  };

  const mockExamen = {
    id: 1,
    estado: EstadoExamen.PROGRAMADO,
  };

  const mockEstudiante = {
    id: 5,
    cod_sis: '201901234',
    ci: '8765432',
    nombre: 'Alejandro',
    apellido: 'Mamani',
  };

  const mockQr = {
    id: 10,
    token: 'qr_test_alejandro',
    estudianteId: 5,
    examenId: 1,
    expiraEn: new Date(Date.now() + 60 * 60 * 1000), // En 1 hora (vigente)
    estudiante: mockEstudiante,
  };

  beforeEach(async () => {
    prismaMock = {
      examen: { findUnique: jest.fn().mockResolvedValue(mockExamen) },
      codigoQr: {
        findUnique: jest.fn().mockResolvedValue(mockQr),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      examen_Estudiante: {
        findUnique: jest.fn().mockResolvedValue({
          estudianteId: 5,
          examenId: 1,
          estado_habilitado: true,
          motivo_inhabilitacion: null,
        }),
      },
      ingreso: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 100,
          estudianteId: 5,
          examenId: 1,
          registradoPor: 2,
          fechaHora: new Date(),
          metodo: 'QR',
          esOffline: false,
          estudiante: mockEstudiante,
        }),
      },
      incidenciaIngreso: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngresosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<IngresosService>(IngresosService);
  });

  // Caso 1: Caso feliz: QR válido y estudiante habilitado
  it('1. Caso feliz: QR válido y estudiante habilitado: expect(result.mensaje).toContain("exitosamente") y create llamado', async () => {
    const result = await service.registrarIngresoQr(
      { examenId: 1, token: 'qr_test_alejandro' },
      2,
    );

    expect(result.mensaje).toContain('exitosamente');
    expect(prismaMock.ingreso.create).toHaveBeenCalled();
  });

  // Caso 2: QR no registrado o inexistente
  it('2. QR no registrado o inexistente: expect(...).rejects.toThrow(NotFoundException) y crea incidencia NO_ENCONTRADO', async () => {
    prismaMock.codigoQr.findUnique.mockResolvedValue(null);

    await expect(
      service.registrarIngresoQr({ examenId: 1, token: 'token_falso' }, 2),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
        }),
      }),
    );
  });

  // Caso 3: QR expirado por tiempo de vigencia
  it('3. QR expirado por tiempo de vigencia: expect(...).rejects.toThrow(BadRequestException) y crea incidencia QR_CADUCADO', async () => {
    prismaMock.codigoQr.findUnique.mockResolvedValue({
      ...mockQr,
      expiraEn: new Date(Date.now() - 5 * 60 * 1000), // Expiró hace 5 min
    });

    await expect(
      service.registrarIngresoQr(
        { examenId: 1, token: 'qr_test_alejandro' },
        2,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoIncidencia: TipoIncidencia.QR_CADUCADO,
        }),
      }),
    );
  });

  // Caso 4: Estudiante inhabilitado por el docente
  it('4. Estudiante inhabilitado por el docente: expect(...).rejects.toThrow(BadRequestException) y crea incidencia NO_HABILITADO', async () => {
    prismaMock.examen_Estudiante.findUnique.mockResolvedValue({
      estudianteId: 5,
      examenId: 1,
      estado_habilitado: false,
      motivo_inhabilitacion: 'No cumplió con el 80% de asistencia',
    });

    await expect(
      service.registrarIngresoQr(
        { examenId: 1, token: 'qr_test_alejandro' },
        2,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
        }),
      }),
    );
  });

  // Caso 5: Doble marcación (ingreso previo existente)
  it('5. Doble marcación (ingreso previo existente): expect(...).rejects.toThrow(ConflictException) y crea incidencia DOBLE_MARCACION', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue({
      id: 99,
      estudianteId: 5,
      examenId: 1,
    });

    await expect(
      service.registrarIngresoQr(
        { examenId: 1, token: 'qr_test_alejandro' },
        2,
      ),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
        }),
      }),
    );
  });
});
