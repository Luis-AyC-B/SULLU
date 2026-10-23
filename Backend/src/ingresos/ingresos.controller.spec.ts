import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngresosController } from './ingresos.controller';
import { IngresosService } from './ingresos.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

describe('UT02-HU09: Validación de enrutamiento y extracción de usuario en endpoint POST /ingresos/qr', () => {
  let controller: IngresosController;
  let serviceMock: {
    registrarIngresoQr: jest.Mock;
    registrarIngresoManual: jest.Mock;
    sincronizarEnLote: jest.Mock;
    findByExamen: jest.Mock;
    buscarEstudiantesExamen: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 2,
    email: 'guardia@umss.edu.bo',
    nombre: 'Juan Pérez',
    roles: ['Personal de control'],
    permisos: ['control_ingreso.escanear_qr'],
    alcances: [],
  };

  beforeEach(async () => {
    serviceMock = {
      registrarIngresoQr: jest.fn(),
      registrarIngresoManual: jest.fn(),
      sincronizarEnLote: jest.fn(),
      findByExamen: jest.fn(),
      buscarEstudiantesExamen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngresosController],
      providers: [
        {
          provide: IngresosService,
          useValue: serviceMock,
        },
        {
          provide: PrismaService,
          useValue: { modulo: { findFirst: jest.fn().mockResolvedValue({ activo: true }) } },
        },
      ],
    }).compile();

    controller = module.get<IngresosController>(IngresosController);
  });

  // Caso 1: Llamada exitosa delegando al servicio con ID del usuario
  it('1. Llamada exitosa delegando al servicio con ID del usuario', async () => {
    const dto = { examenId: 1, token: 'qr_test' };
    const mockResponse = {
      mensaje: 'Ingreso por QR registrado exitosamente',
      ingreso: { id: 1, examenId: 1, estudianteId: 5 },
    };

    serviceMock.registrarIngresoQr.mockResolvedValue(mockResponse);

    const result = await controller.registrarQr(dto, mockUser);

    expect(serviceMock.registrarIngresoQr).toHaveBeenCalledWith(dto, 2);
    expect(result).toBeDefined();
    expect(result.mensaje).toContain('exitosamente');
  });

  // Caso 2: Propagación transparente de excepciones del servicio
  it('2. Propagación transparente de excepciones del servicio', async () => {
    const dto = { examenId: 1, token: 'qr_invalido' };

    serviceMock.registrarIngresoQr.mockRejectedValue(
      new BadRequestException('El código QR presentado ha expirado'),
    );

    await expect(controller.registrarQr(dto, mockUser)).rejects.toThrow(
      BadRequestException,
    );
  });
});
