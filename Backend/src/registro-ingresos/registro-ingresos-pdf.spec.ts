import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
      fecha: new Date('2026-10-31T00:00:00.000Z'),
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
        fecha: '2026-10-31',
        horario: '08:15 - 09:45',
        totalHabilitados: 2,
        totalPresentes: 1,
        totalAusentes: 1,
        porcentajeAsistencia: 50,
        fechaGeneracion: '31/10/2026 09:50:00',
        estudiantes: [
          {
            numero: 1,
            codSis: '202001001',
            estudiante: 'Aguilar Rivas Fernando',
            habilitado: true,
            asistio: true,
            horaIngreso: '08:20',
            metodo: 'QR',
          },
          {
            numero: 2,
            codSis: '202001002',
            estudiante: 'Zeballos Castro Carlos',
            habilitado: true,
            asistio: false,
            horaIngreso: '-',
            metodo: '-',
          },
        ],
      };

      const buffer = await pdfService.generarPdf(mockData);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      // Validar cabecera PDF (%PDF-)
      const pdfHeader = buffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('debe generar el reporte correctamente cuando no hay estudiantes registrados (tabla vacía)', async () => {
      const mockDataVacia: ReporteAsistenciaPdfData = {
        examenId: 2,
        materia: 'Redes de Computadoras',
        tipoExamen: 'Segundo Parcial',
        carrera: 'Ingeniería Informática',
        docente: 'Edgar Flores Tola',
        ambiente: 'Aula A-101',
        fecha: '2026-10-31',
        horario: '14:15 - 15:45',
        totalHabilitados: 0,
        totalPresentes: 0,
        totalAusentes: 0,
        porcentajeAsistencia: 0,
        fechaGeneracion: '31/10/2026 16:00:00',
        estudiantes: [],
      };

      const buffer = await pdfService.generarPdf(mockDataVacia);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(300);
    });
  });

  describe('RegistroIngresosService.generarReportePdf', () => {
    it('debe consolidar la información y retornar el buffer con su nombre de archivo formateado', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      // Usuario 10 es el docente responsable
      prismaMock.examen.findFirst.mockResolvedValue({ id: 1 });

      prismaMock.examen_Estudiante.findMany.mockResolvedValue([
        {
          estudianteId: 101,
          estado_habilitado: true,
          estudiante: {
            cod_sis: '202001001',
            nombre: 'Fernando',
            apellido: 'Aguilar Rivas',
          },
        },
        {
          estudianteId: 102,
          estado_habilitado: true,
          estudiante: {
            cod_sis: '202001002',
            nombre: 'Carlos',
            apellido: 'Zeballos Castro',
          },
        },
      ]);

      prismaMock.ingreso.findMany.mockResolvedValue([
        {
          id: 1,
          estudianteId: 101,
          fechaHora: new Date('2026-10-31T12:20:00.000Z'),
          metodo: 'QR',
        },
      ]);

      const resultado = await service.generarReportePdf(1, 10);

      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
      expect(resultado.filename).toMatch(
        /^reporte-asistencia-bases-de-datos-i-.*\.pdf$/,
      );
    });

    it('debe lanzar ForbiddenException si el usuario no es responsable, ni controlador ni admin', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      prismaMock.examen.findFirst.mockResolvedValue(null);
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 999,
        roles: [{ rol: { nombre: 'ESTUDIANTE' } }],
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

    it('debe permitir la descarga si el usuario es administrador', async () => {
      prismaMock.examen.findUnique.mockResolvedValue(mockExamenPdf);
      // No asignado directamente al examen
      prismaMock.examen.findFirst.mockResolvedValue(null);
      // Pero tiene rol ADMIN
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 999,
        roles: [{ rol: { nombre: 'ADMIN' } }],
      });
      prismaMock.examen_Estudiante.findMany.mockResolvedValue([]);
      prismaMock.ingreso.findMany.mockResolvedValue([]);

      const resultado = await service.generarReportePdf(1, 999);
      expect(resultado).toBeDefined();
      expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
    });
  });
});
