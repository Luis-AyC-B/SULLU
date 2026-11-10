import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AsistenciaPdfService,
  ReporteAsistenciaPdfData,
} from './asistencia-pdf.service';
import { RegistroIngresosService } from './registro-ingresos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HU17: Reporte de Asistencia en PDF (Registro de Ingresos)', () => {
  let pdfService: AsistenciaPdfService;
  let service: RegistroIngresosService;
  let prismaMock: Record<string, any>;

  const mockExamenPdf = {
    id: 1,
    usuarioId: 10,
    tipoExamen: 'Primer Parcial',
    reservaAmbiente: {
      fecha: new Date('2026-10-19T00:00:00.000Z'),
      ambiente: { nombre: 'Laboratorio de Informática 1' },
      horarioFijo: {
        horaIni: new Date('1970-01-01T08:15:00.000Z'),
        horaFin: new Date('1970-01-01T09:45:00.000Z'),
      },
    },
    responsable: {
      id: 10,
      nombre: 'Miriam',
      apellido: 'Morales Serrudo',
    },
    carrerasMaterias: [
      {
        carrera_materia: {
          materia: { nombre: 'Bases de Datos I' },
          carrera: { nombre: 'Ingeniería de Sistemas' },
        },
      },
    ],
  };

  beforeEach(() => {
    pdfService = new AsistenciaPdfService();
    prismaMock = {
      examen: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      examen_Estudiante: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      ingreso: {
        findMany: jest.fn(),
      },
      incidenciaIngreso: {
        findMany: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
    };

    service = new RegistroIngresosService(
      prismaMock as unknown as PrismaService,
      pdfService,
    );
  });

  describe('AsistenciaPdfService (Generador de PDF)', () => {
    it('debe generar un buffer binario válido que inicie con la firma mágica %PDF', async () => {
      const mockData: ReporteAsistenciaPdfData = {
        examenId: 1,
        materia: 'Bases de Datos I',
        tipoExamen: 'Primer Parcial',
        carrera: 'Ingeniería de Sistemas',
        docente: 'Miriam Morales Serrudo',
        ambiente: 'Laboratorio de Informática 1',
        fecha: '2026-10-19',
        horario: '08:15 - 09:45',
        totalHabilitados: 10,
        totalIngresos: 2,
        porcentajeAsistencia: 20,
        fechaGeneracion: '19/10/2026 09:50:00',
        ingresos: [
          {
            numero: 1,
            hora: '08:20',
            codSis: '202001001',
            estudiante: 'Aguilar Rivas Fernando',
            metodo: 'QR',
            estado: 'Ingresado',
            casoExcepcional: '-',
          },
          {
            numero: 2,
            hora: '08:35',
            codSis: '202001002',
            estudiante: 'Zeballos Castro Carlos',
            metodo: 'Manual',
            estado: 'Ingresado',
            casoExcepcional: 'Cita médica',
          },
        ],
      };

      const buffer = await pdfService.generarPdf(mockData);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      const pdfHeader = buffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('debe generar el reporte con aviso visual si la lista de ingresos está vacía', async () => {
      const mockDataVacia: ReporteAsistenciaPdfData = {
        examenId: 2,
        materia: 'Redes de Computadoras',
        tipoExamen: 'Segundo Parcial',
        carrera: 'Ingeniería Informática',
        docente: 'Edgar Flores Tola',
        ambiente: 'Aula A-101',
        fecha: '2026-10-19',
        horario: '14:15 - 15:45',
        totalHabilitados: 5,
        totalIngresos: 0,
        porcentajeAsistencia: 0,
        fechaGeneracion: '19/10/2026 16:00:00',
        ingresos: [],
      };

      const buffer = await pdfService.generarPdf(mockDataVacia);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(300);
    });
  });

  describe('RegistroIngresosService.generarReportePdf', () => {
    it('debe listar solo a los que ingresaron y generar el nombre de archivo según Criterio 23', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      prismaMock.examen_Estudiante.findMany.mockResolvedValue([
        { estudianteId: 101, estado_habilitado: true },
        { estudianteId: 102, estado_habilitado: true },
        { estudianteId: 103, estado_habilitado: true },
      ]);

      prismaMock.ingreso.findMany.mockResolvedValue([
        {
          id: 1,
          estudianteId: 101,
          fechaHora: new Date('2026-10-19T12:20:00.000Z'),
          metodo: 'QR',
          estudiante: {
            cod_sis: '202001001',
            nombre: 'Fernando',
            apellido: 'Aguilar Rivas',
          },
        },
      ]);

      prismaMock.incidenciaIngreso.findMany.mockResolvedValue([
        { estudianteId: 101, descripcion: 'Cita médica' },
      ]);

      // Usuario 10 es el docente responsable del examen
      const resultado = await service.generarReportePdf(1, 10);

      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      // Criterio 23: ingresos_BasesDeDatosI_PrimerParcial_19-10-2026.pdf
      expect(resultado.filename).toBe(
        'ingresos_BasesDeDatosI_PrimerParcial_19-10-2026.pdf',
      );
    });

    it('debe lanzar BadRequestException si el examen no tiene ingresos registrados (Criterio 8 y EN2)', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      prismaMock.examen_Estudiante.findMany.mockResolvedValue([
        { estudianteId: 101, estado_habilitado: true },
      ]);
      prismaMock.ingreso.findMany.mockResolvedValue([]);
      prismaMock.incidenciaIngreso.findMany.mockResolvedValue([]);

      await expect(service.generarReportePdf(1, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ForbiddenException (403) si el usuario es un controlador u otro rol no docente (Criterio 22 y EN7)', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      // Usuario 999 no es el docente responsable (docenteId 10)
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 999,
        roles: [{ rol: { nombre: 'CONTROLADOR' } }],
      });

      await expect(service.generarReportePdf(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar NotFoundException si el examen no existe', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(null);

      await expect(service.generarReportePdf(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe permitir la descarga si el usuario es administrador aunque no sea el docente responsable', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 999,
        roles: [{ rol: { nombre: 'ADMIN' } }],
      });
      prismaMock.examen_Estudiante.findMany.mockResolvedValue([
        { estudianteId: 101, estado_habilitado: true },
      ]);
      prismaMock.ingreso.findMany.mockResolvedValue([
        {
          id: 1,
          estudianteId: 101,
          fechaHora: new Date('2026-10-19T12:20:00.000Z'),
          metodo: 'QR',
          estudiante: {
            cod_sis: '202001001',
            nombre: 'Fernando',
            apellido: 'Aguilar Rivas',
          },
        },
      ]);
      prismaMock.incidenciaIngreso.findMany.mockResolvedValue([]);

      const resultado = await service.generarReportePdf(1, 999);
      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
    });
  });
});
