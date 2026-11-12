/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MotivoObservacion } from './dto/filtro-observaciones.dto';
import { ObservacionesIngresoService } from './observaciones-ingreso.service';
import { ObservacionesPdfService } from './observaciones-pdf.service';

describe('ObservacionesIngresoService', () => {
  let service: ObservacionesIngresoService;
  let prisma: PrismaService;
  let pdfService: ObservacionesPdfService;

  const mockAdminUser: AuthenticatedUser = {
    id: 1,
    nombre: 'Administrador General',
    email: 'admin@umss.edu.bo',
    permisos: ['registro_ingresos.ver', 'auditoria.ver', 'roles.ver'],
    rol: 'Administrador Total',
  };

  const mockDocenteUser: AuthenticatedUser = {
    id: 10,
    nombre: 'Profesor Carlos',
    email: 'carlos@umss.edu.bo',
    permisos: ['registro_ingresos.ver', 'incidencias.ver'],
    rol: 'Docente',
  };

  const mockControlUser: AuthenticatedUser = {
    id: 20,
    nombre: 'Control Juan',
    email: 'juan@umss.edu.bo',
    permisos: ['registro_ingresos.ver', 'incidencias.ver'],
    rol: 'Personal de control',
  };

  const mockExamenPropio = {
    id: 1,
    usuarioId: 10,
    tipoExamen: 'Primer parcial',
    carrerasMaterias: [
      {
        carrera_materia: {
          materia: { id: 1, nombre: 'Bases de Datos I' },
          carrera: {
            id: 1,
            nombre: 'Ingeniería de Sistemas',
            facultad: { id: 1, nombre: 'Facultad de Ciencias y Tecnología' },
          },
        },
      },
    ],
    reservaAmbiente: {
      fecha: new Date('2026-10-19T00:00:00.000Z'),
      ambiente: {
        nombre: 'Laboratorio Informática 1',
        facultad: { id: 1, nombre: 'Facultad de Ciencias y Tecnología' },
      },
      horarioFijo: {
        horaIni: new Date('1970-01-01T08:15:00.000Z'),
        horaFin: new Date('1970-01-01T09:45:00.000Z'),
      },
    },
    controladores: [{ colaboradorId: 20 }],
    responsable: { id: 10, nombre: 'Carlos', apellido: 'Mendoza' },
  };

  const mockIncidencias = [
    {
      id: 1,
      examenId: 1,
      fechaHora: new Date('2026-10-19T09:03:44.000Z'),
      tipoIncidencia: 'NO_HABILITADO',
      codSisIngresado: null,
      nombreReferencial: null,
      estudiante: {
        cod_sis: '202104321',
        nombre: 'Sofía',
        apellido: 'Aguilar Céspedes',
      },
      controlador: {
        nombre: 'Carlos',
        apellido: 'Mendoza',
      },
      examen: mockExamenPropio,
    },
    {
      id: 2,
      examenId: 1,
      fechaHora: new Date('2026-10-19T09:02:15.000Z'),
      tipoIncidencia: 'DOBLE_MARCACION',
      codSisIngresado: null,
      nombreReferencial: null,
      estudiante: {
        cod_sis: '202003456',
        nombre: 'Andrés',
        apellido: 'Villarroel Rocha',
      },
      controlador: {
        nombre: 'Carlos',
        apellido: 'Mendoza',
      },
      examen: mockExamenPropio,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservacionesIngresoService,
        {
          provide: PrismaService,
          useValue: {
            examen: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            incidenciaIngreso: {
              findMany: jest.fn(),
            },
            usuario: {
              findUnique: jest.fn().mockResolvedValue({
                id: 10,
                nombre: 'Carlos',
                apellido: 'Mendoza',
                deletedAt: null,
                roles: [
                  {
                    rol: {
                      modulos: [
                        {
                          modulo: {
                            nombre: 'Registro de ingresos',
                            activo: true,
                          },
                        },
                      ],
                      permisos: [
                        { permiso: { clave: 'registro_ingresos.ver' } },
                      ],
                    },
                  },
                ],
              }),
            },
            usuario_Alcance: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue(null),
            },
            carrera_Materia: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            facultad: {
              findUnique: jest.fn().mockResolvedValue({
                id: 1,
                nombre: 'Facultad de Ciencias y Tecnología',
              }),
            },
            carrera: {
              findUnique: jest.fn().mockResolvedValue({
                id: 1,
                nombre: 'Ingeniería de Sistemas',
              }),
            },
            materia: {
              findUnique: jest.fn().mockResolvedValue({
                id: 1,
                nombre: 'Bases de Datos I',
              }),
            },
            bitacora_Auditoria: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          },
        },
        {
          provide: ObservacionesPdfService,
          useValue: {
            generar: jest
              .fn()
              .mockResolvedValue(Buffer.from('%PDF-1.4 mock content')),
          },
        },
      ],
    }).compile();

    service = module.get<ObservacionesIngresoService>(
      ObservacionesIngresoService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    pdfService = module.get<ObservacionesPdfService>(ObservacionesPdfService);
  });

  describe('listar', () => {
    it('debe devolver items ordenados y total para examen propio del docente', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);

      const resultado = await service.listar(mockDocenteUser, {
        examenId: 1,
        motivo: MotivoObservacion.NO_HABILITADO,
        gestion: 'Gestión 2/2026',
      });

      expect(resultado.total).toBe(2);
      expect(resultado.items.length).toBe(2);
      expect(resultado.items[0].codigoSis).toBe('202104321');
      expect(resultado.items[0].estudiante).toBe('Sofía Aguilar Céspedes');
      expect(resultado.items[0].motivo).toBe('NO_HABILITADO');
      expect(resultado.items[0].registradoPor).toBe('Carlos Mendoza');
      expect(resultado.items[0].hora).toBeDefined();
    });

    it('debe permitir a Administrador consultar con cualquier filtro', async () => {
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);

      const resultado = await service.listar(mockAdminUser, {
        facultadId: 1,
        carreraId: 1,
        docenteId: 10,
        materiaId: 1,
        gestion: 'Gestión 2/2026',
      });

      expect(resultado.total).toBe(2);
    });

    it('debe rechazar con 400 Bad Request si la gestión es de un año distinto al en curso', async () => {
      await expect(
        service.listar(mockDocenteUser, { gestion: 'Gestión 1/2025' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con 400 Bad Request si el formato de la gestión es inválido', async () => {
      await expect(
        service.listar(mockDocenteUser, { gestion: 'Gestión 3/2026' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 403 Forbidden si el docente intenta consultar un examen ajeno', async () => {
      jest.spyOn(prisma.examen, 'findUnique').mockResolvedValue({
        ...mockExamenPropio,
        usuarioId: 999, // Otro docente
      } as any);

      await expect(
        service.listar(mockDocenteUser, { examenId: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir a personal de control consultar un examen donde está asignado', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);

      const resultado = await service.listar(mockControlUser, { examenId: 1 });
      expect(resultado.total).toBe(2);
    });

    it('debe lanzar 403 Forbidden a personal de control si intenta filtrar por facultad o carrera', async () => {
      await expect(
        service.listar(mockControlUser, { facultadId: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar 403 Forbidden a personal de control si no está asignado al examen', async () => {
      jest.spyOn(prisma.examen, 'findUnique').mockResolvedValue({
        ...mockExamenPropio,
        usuarioId: 999,
        controladores: [], // Sin asignar a este usuario
      } as any);

      await expect(
        service.listar(mockControlUser, { examenId: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe devolver total 0 y lista vacía si no hay registros', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest.spyOn(prisma.incidenciaIngreso, 'findMany').mockResolvedValue([]);

      const resultado = await service.listar(mockDocenteUser, { examenId: 1 });
      expect(resultado.total).toBe(0);
      expect(resultado.items).toEqual([]);
    });

    it('debe lanzar 404 NotFound si el examen consultado no existe', async () => {
      jest.spyOn(prisma.examen, 'findUnique').mockResolvedValue(null);

      await expect(
        service.listar(mockDocenteUser, { examenId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generarReportePdf', () => {
    it('debe generar el PDF y registrar en la bitácora de auditoría para el docente', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        nombre: 'Carlos',
        apellido: 'Docente',
      } as any);
      const auditSpy = jest
        .spyOn(prisma.bitacora_Auditoria, 'create')
        .mockResolvedValue({} as any);

      const resultado = await service.generarReportePdf(
        mockDocenteUser,
        { examenId: 1, gestion: 'Gestión 2/2026' },
        '127.0.0.1',
      );

      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.filename).toContain('observaciones_');
      expect(resultado.filename).toContain('Gestion2-2026');
      expect(pdfService.generar).toHaveBeenCalledTimes(1);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuarioId: mockDocenteUser.id,
            accion: 'DESCARGA_REPORTE_OBSERVACIONES_INGRESO',
            modulo: 'Registro de ingresos',
            tablaAfectada: 'incidencia_ingreso',
          }),
        }),
      );
    });

    it('debe permitir a Administrador descargar PDF para toda la institución', async () => {
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);

      const resultado = await service.generarReportePdf(
        mockAdminUser,
        { gestion: 'Gestión 2/2026' },
        '127.0.0.1',
      );

      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.filename).toContain('observaciones_');
    });

    it('debe permitir a Personal de control descargar PDF de sus exámenes asignados', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest
        .spyOn(prisma.incidenciaIngreso, 'findMany')
        .mockResolvedValue(mockIncidencias as any);

      const resultado = await service.generarReportePdf(
        mockControlUser,
        { examenId: 1, gestion: 'Gestión 2/2026' },
        '127.0.0.1',
      );

      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe lanzar 400 BadRequest y NO generar PDF si no hay observaciones con los filtros', async () => {
      jest
        .spyOn(prisma.examen, 'findUnique')
        .mockResolvedValue(mockExamenPropio as any);
      jest.spyOn(prisma.incidenciaIngreso, 'findMany').mockResolvedValue([]);

      await expect(
        service.generarReportePdf(mockDocenteUser, {
          examenId: 1,
          motivo: MotivoObservacion.QR_NO_VALIDO,
          gestion: 'Gestión 2/2026',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(pdfService.generar).not.toHaveBeenCalled();
    });
  });
});
