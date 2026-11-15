/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MotivoObservacion } from './dto/filtro-observaciones.dto';
import { ObservacionesIngresoController } from './observaciones-ingreso.controller';
import { ObservacionesIngresoService } from './observaciones-ingreso.service';

describe('ObservacionesIngresoController', () => {
  let controller: ObservacionesIngresoController;
  let service: ObservacionesIngresoService;

  const mockUser: AuthenticatedUser = {
    id: 10,
    nombre: 'Profesor Carlos',
    email: 'carlos@umss.edu.bo',
    permisos: ['registro_ingresos.ver'],
    rol: 'Docente',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservacionesIngresoController],
      providers: [
        {
          provide: ObservacionesIngresoService,
          useValue: {
            listar: jest.fn().mockResolvedValue({ total: 0, items: [] }),
            generarReportePdf: jest.fn().mockResolvedValue({
              buffer: Buffer.from('%PDF-1.4'),
              filename:
                'observaciones_BasesDeDatos_PrimerParcial_19-10-2026.pdf',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ObservacionesIngresoController>(
      ObservacionesIngresoController,
    );
    service = module.get<ObservacionesIngresoService>(
      ObservacionesIngresoService,
    );
  });

  it('debe llamar al servicio listar con los filtros correctos', async () => {
    await controller.listar(mockUser, {
      examenId: 1,
      motivo: MotivoObservacion.NO_HABILITADO,
      gestion: 'Gestión 2/2026',
    });

    expect(service.listar).toHaveBeenCalledWith(mockUser, {
      examenId: 1,
      motivo: MotivoObservacion.NO_HABILITADO,
      gestion: 'Gestión 2/2026',
    });
  });

  it('debe configurar las cabeceras HTTP y enviar el buffer en descargarPdf (GET)', async () => {
    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;

    await controller.descargarPdf(
      mockUser,
      { examenId: 1, gestion: 'Gestión 2/2026' },
      '127.0.0.1',
      res,
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="observaciones_BasesDeDatos_PrimerParcial_19-10-2026.pdf"',
    );
    expect(res.end).toHaveBeenCalled();
  });

  it('debe soportar la descarga vía POST en descargarPdfPost', async () => {
    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;

    await controller.descargarPdfPost(
      mockUser,
      { materiaId: 1, gestion: 'Gestión 2/2026' },
      {},
      '127.0.0.1',
      res,
    );

    expect(service.generarReportePdf).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({ materiaId: 1, gestion: 'Gestión 2/2026' }),
      '127.0.0.1',
    );
    expect(res.end).toHaveBeenCalled();
  });
});
