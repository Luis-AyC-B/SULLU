import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstudianteMeService } from '../estudiante-me.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QrTokenService } from '../qr-token.service';
import { COMPARADOR_FACIAL_TOKEN } from './comparador-facial.interface';
import { StubComparadorFacial } from './stub-comparador-facial.service';

describe('Suite de Comparación Facial y Reglas Biométricas (Sprint 3)', () => {
  let service: EstudianteMeService;
  let stubComparador: StubComparadorFacial;

  const mockPrismaService = {
    estudiante: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fotoEstudiante: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    bitacora_Auditoria: {
      create: jest.fn(),
    },
    codigoQr: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockQrTokenService = {
    generar: jest.fn().mockResolvedValue('token-qr-prueba'),
    validar: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    stubComparador = new StubComparadorFacial();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstudianteMeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QrTokenService, useValue: mockQrTokenService },
        { provide: COMPARADOR_FACIAL_TOKEN, useValue: stubComparador },
      ],
    }).compile();

    service = module.get<EstudianteMeService>(EstudianteMeService);

    jest.clearAllMocks();
    stubComparador.reset();
  });

  const dummyBuffer = Buffer.from('mock-bytes-de-prueba-imagen-facial-con-mas-de-500-bytes'.repeat(15));
  const mockFile = {
    fieldname: 'foto',
    originalname: 'nueva-foto.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 50000,
    filename: 'foto-12345.jpg',
    path: '',
    destination: 'C:/mock/uploads/estudiantes',
    buffer: dummyBuffer,
  } as Express.Multer.File;

  describe('1. Regla de Detección de Rostros', () => {
    it('Caso 0 rostros: debe rechazar con BadRequestException si no se detecta ningún rostro', async () => {
      mockPrismaService.estudiante.findUnique.mockResolvedValue({ id: 1, usuarioId: 10 });
      mockPrismaService.fotoEstudiante.findFirst.mockResolvedValue(null);

      // Simula 0 rostros detectados
      stubComparador.configurarSimulacion({ rostros: 0 });

      await expect(service.procesarSubidaFoto(10, mockFile, '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.procesarSubidaFoto(10, mockFile, '127.0.0.1')).rejects.toThrow(
        /No se detectó ningún rostro/,
      );
    });

    it('Caso múltiples rostros (>1): debe rechazar si se detecta más de 1 persona en la foto', async () => {
      mockPrismaService.estudiante.findUnique.mockResolvedValue({ id: 1, usuarioId: 10 });
      mockPrismaService.fotoEstudiante.findFirst.mockResolvedValue(null);

      // Simula 2 rostros detectados
      stubComparador.configurarSimulacion({ rostros: 2 });

      await expect(service.procesarSubidaFoto(10, mockFile, '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.procesarSubidaFoto(10, mockFile, '127.0.0.1')).rejects.toThrow(
        /múltiples rostros/,
      );
    });
  });

  describe('2. Primera Foto del Estudiante', () => {
    it('Con exactamente 1 rostro: pasa directamente a ACTIVA con similitud 1.0', async () => {
      mockPrismaService.estudiante.findUnique.mockResolvedValue({
        id: 1,
        usuarioId: 10,
        telefono: '71234567',
        fotoUrl: null,
      });
      // Sin foto previa activa
      mockPrismaService.fotoEstudiante.findFirst.mockResolvedValue(null);
      mockPrismaService.fotoEstudiante.create.mockResolvedValue({
        id: 100,
        archivo: '/uploads/estudiantes/foto-12345.jpg',
        estado: 'ACTIVA',
      });

      stubComparador.configurarSimulacion({ rostros: 1 });

      const resultado = await service.procesarSubidaFoto(10, mockFile, '127.0.0.1');

      expect(resultado.estado).toBe('ACTIVA');
      expect(resultado.similitud).toBe(1.0);
      expect(mockPrismaService.fotoEstudiante.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ACTIVA',
            similitud: 1.0,
          }),
        }),
      );
    });
  });

  describe('3. Cambio de Foto y Umbrales Biométricos', () => {
    beforeEach(() => {
      mockPrismaService.estudiante.findUnique.mockResolvedValue({
        id: 1,
        usuarioId: 10,
        telefono: '71234567',
        fotoUrl: '/uploads/estudiantes/foto-antigua.jpg',
      });
    });

    it('Caso Misma Persona (similitud >= 0.85): la nueva foto pasa a ACTIVA y la anterior a REEMPLAZADA', async () => {
      mockPrismaService.fotoEstudiante.findFirst
        .mockResolvedValueOnce(null) // para verificación de hash duplicado
        .mockResolvedValueOnce({
          id: 50,
          estudianteId: 1,
          archivo: '/uploads/estudiantes/foto-antigua.jpg',
          estado: 'ACTIVA',
        });

      mockPrismaService.fotoEstudiante.create.mockResolvedValue({
        id: 101,
        archivo: '/uploads/estudiantes/foto-12345.jpg',
        estado: 'ACTIVA',
        similitud: 0.94,
      });

      // Simula coincidencia alta (0.94 >= 0.85)
      stubComparador.configurarSimulacion({ similitud: 0.94, rostros: 1 });

      const resultado = await service.procesarSubidaFoto(10, mockFile, '127.0.0.1');

      expect(resultado.estado).toBe('ACTIVA');
      expect(resultado.similitud).toBe(0.94);
      expect(mockPrismaService.fotoEstudiante.updateMany).toHaveBeenCalledWith({
        where: { estudianteId: 1, estado: 'ACTIVA' },
        data: { estado: 'REEMPLAZADA' },
      });
      expect(mockPrismaService.estudiante.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ fotoUrl: '/uploads/estudiantes/foto-12345.jpg' }),
        }),
      );
    });

    it('Caso Revisión Manual (0.60 <= similitud < 0.85): pasa a estado PENDIENTE y la foto previa sigue ACTIVA', async () => {
      mockPrismaService.fotoEstudiante.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 50,
          estudianteId: 1,
          archivo: '/uploads/estudiantes/foto-antigua.jpg',
          estado: 'ACTIVA',
        });

      mockPrismaService.fotoEstudiante.create.mockResolvedValue({
        id: 102,
        archivo: '/uploads/estudiantes/foto-12345.jpg',
        estado: 'PENDIENTE',
        similitud: 0.72,
      });

      // Simula similitud intermedia (0.72)
      stubComparador.configurarSimulacion({ similitud: 0.72, rostros: 1 });

      const resultado = await service.procesarSubidaFoto(10, mockFile, '127.0.0.1');

      expect(resultado.estado).toBe('PENDIENTE');
      expect(resultado.similitud).toBe(0.72);
      // La foto anterior NO debe ser reemplazada
      expect(mockPrismaService.fotoEstudiante.updateMany).not.toHaveBeenCalled();
    });

    it('Caso Dos Personas Distintas (similitud < 0.60): pasa a estado RECHAZADA', async () => {
      mockPrismaService.fotoEstudiante.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 50,
          estudianteId: 1,
          archivo: '/uploads/estudiantes/foto-antigua.jpg',
          estado: 'ACTIVA',
        });

      mockPrismaService.fotoEstudiante.create.mockResolvedValue({
        id: 103,
        archivo: '/uploads/estudiantes/foto-12345.jpg',
        estado: 'RECHAZADA',
        similitud: 0.38,
      });

      // Simula dos personas distintas (0.38 < 0.60)
      stubComparador.configurarSimulacion({ similitud: 0.38, rostros: 1 });

      const resultado = await service.procesarSubidaFoto(10, mockFile, '127.0.0.1');

      expect(resultado.estado).toBe('RECHAZADA');
      expect(resultado.similitud).toBe(0.38);
      // No debe sobreescribir la foto activa
      expect(mockPrismaService.fotoEstudiante.updateMany).not.toHaveBeenCalled();
    });

    it('Caso Comparador Caído o Error Inesperado: la foto queda PENDIENTE (nunca ACTIVA por defecto)', async () => {
      mockPrismaService.fotoEstudiante.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 50,
          estudianteId: 1,
          archivo: '/uploads/estudiantes/foto-antigua.jpg',
          estado: 'ACTIVA',
        });

      mockPrismaService.fotoEstudiante.create.mockResolvedValue({
        id: 104,
        archivo: '/uploads/estudiantes/foto-12345.jpg',
        estado: 'PENDIENTE',
        similitud: null,
      });

      // Simula caída del servicio comparador
      stubComparador.configurarSimulacion({ debeFallar: true });

      const resultado = await service.procesarSubidaFoto(10, mockFile, '127.0.0.1');

      expect(resultado.estado).toBe('PENDIENTE');
      expect(resultado.similitud).toBeNull();
      expect(mockPrismaService.fotoEstudiante.updateMany).not.toHaveBeenCalled();
    });
  });
});

