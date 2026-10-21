import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EstudianteMeService } from './estudiante-me.service';
import { QrTokenService } from './qr-token.service';
import { PrismaService } from '../prisma/prisma.service';
import { ValidadorFotoStubService } from './validador-foto/validador-foto-stub.service';
import { EstudianteJwtGuard, EstudianteRequest } from './estudiante-jwt.guard';
import { jwtSecret } from '../auth/jwt-secret';

describe('Suite de Pruebas HU6 (Portal Estudiante, Foto, Password y QR)', () => {
  let meService: EstudianteMeService;
  let qrService: QrTokenService;
  let validadorFoto: ValidadorFotoStubService;
  let guard: EstudianteJwtGuard;
  let jwtService: JwtService;

  const mockUsuarioFindUnique = jest.fn();
  const mockUsuarioUpdate = jest.fn();
  const mockEstudianteFindUnique = jest.fn();
  const mockEstudianteUpdate = jest.fn();
  const mockFotoUpdateMany = jest.fn();
  const mockFotoCreate = jest.fn();
  const mockFotoFindMany = jest.fn();
  const mockCodigoQrDeleteMany = jest.fn().mockResolvedValue({ count: 1 });
  const mockCodigoQrCreate = jest.fn();
  const mockCodigoQrFindUnique = jest.fn();
  const mockBitacoraCreate = jest.fn();

  const mockPrismaService = {
    usuario: {
      findUnique: mockUsuarioFindUnique,
      update: mockUsuarioUpdate,
    },
    estudiante: {
      findUnique: mockEstudianteFindUnique,
      update: mockEstudianteUpdate,
    },
    fotoEstudiante: {
      updateMany: mockFotoUpdateMany,
      create: mockFotoCreate,
      findMany: mockFotoFindMany,
    },
    codigoQr: {
      deleteMany: mockCodigoQrDeleteMany,
      create: mockCodigoQrCreate,
      findUnique: mockCodigoQrFindUnique,
    },
    bitacora_Auditoria: {
      create: mockBitacoraCreate,
    },
    $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb(mockPrismaService),
    ),
  };

  beforeEach(() => {
    jwtService = new JwtService();

    mockCodigoQrCreate.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 1, ...data }),
    );
    mockCodigoQrFindUnique.mockImplementation(
      ({ where }: { where: { token: string } }) =>
        Promise.resolve({
          id: 1,
          token: where.token,
          estudianteId: 42,
          expiraEn: new Date(Date.now() + 300000),
        }),
    );

    const prisma = mockPrismaService as unknown as PrismaService;
    validadorFoto = new ValidadorFotoStubService();
    qrService = new QrTokenService(prisma, jwtService);
    meService = new EstudianteMeService(prisma, qrService, validadorFoto);
    guard = new EstudianteJwtGuard(jwtService, prisma);

    jest.clearAllMocks();
  });

  describe('1. ValidadorFoto Stub (Sprint 2 -> Sprint 3 Hook)', () => {
    it('debe aprobar automáticamente la foto en el stub de sprint 2', async () => {
      const dummyBuffer = Buffer.from('imagen-de-prueba');
      const resultado: { aprobado: boolean; similitud?: number | null } =
        await validadorFoto.validar(dummyBuffer);
      expect(resultado.aprobado).toBe(true);
      expect(resultado.similitud).toBe(1.0);
    });
  });

  describe('2. Generación, Verificación y Revocación de QR Seguro', () => {
    it('debe generar un token JWT con versión del QR y validarlo exitosamente', async () => {
      mockEstudianteFindUnique.mockResolvedValue({
        id: 42,
        qrVersion: 1,
      });

      const token = await qrService.generar(42);
      expect(typeof token).toBe('string');

      const estudianteId = await qrService.validar(token);
      expect(estudianteId).toBe(42);
    });

    it('debe revocar el token si el qrVersion del estudiante cambió (ej. cambio de clave o foto)', async () => {
      // Estudiante emitió token con versión 1
      mockEstudianteFindUnique.mockResolvedValueOnce({
        id: 42,
        qrVersion: 1,
      });
      const token = await qrService.generar(42);

      // Posteriormente incrementó su versión a 2
      mockEstudianteFindUnique.mockResolvedValueOnce({
        id: 42,
        qrVersion: 2,
      });

      await expect(qrService.validar(token)).rejects.toThrow(/revocado/);
    });
  });

  describe('3. Cambio de Contraseña y Transacción de Perfil', () => {
    it('debe rechazar si la nueva contraseña es igual al CI del estudiante', async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        password: await bcrypt.hash('Vieja1234', 10),
        estudiante: { id: 1, ci: '8123456' },
      });

      await expect(
        meService.cambiarPassword(10, {
          passwordActual: 'Vieja1234',
          passwordNueva: '8123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si la nueva contraseña es igual a la actual', async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        password: await bcrypt.hash('Clave1234', 10),
        estudiante: { id: 1, ci: '8123456' },
      });

      await expect(
        meService.cambiarPassword(10, {
          passwordActual: 'Clave1234',
          passwordNueva: 'Clave1234',
        }),
      ).rejects.toThrow(/distinta/);
    });

    it('debe rechazar con BadRequest (NUNCA 401) si la contraseña actual no coincide', async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        password: await bcrypt.hash('Correcta123', 10),
        estudiante: { id: 1, ci: '8123456' },
      });

      try {
        await meService.cambiarPassword(10, {
          passwordActual: 'Incorrecta123',
          passwordNueva: 'NuevaClave99',
        });
        fail('Debió lanzar excepción');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('debe cambiar la contraseña, invalidar sesiones anteriores y poner debeConfigurarPerfil=false', async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        password: await bcrypt.hash('ClaveVieja1', 10),
        estudiante: { id: 1, ci: '8123456' },
      });

      const res: { debeConfigurarPerfil: boolean; perfilCompleto: boolean } =
        await meService.cambiarPassword(10, {
          passwordActual: 'ClaveVieja1',
          passwordNueva: 'ClaveNueva1',
        });

      expect(res.debeConfigurarPerfil).toBe(false);
      expect(res.perfilCompleto).toBe(true);
      expect(mockUsuarioUpdate).toHaveBeenCalledWith(
        expect.objectContaining<Record<string, unknown>>({
          data: expect.objectContaining<Record<string, unknown>>({
            debeConfigurarPerfil: false,
            debeCambiarPassword: false,
          }),
        }),
      );
      expect(mockEstudianteUpdate).toHaveBeenCalledWith(
        expect.objectContaining<Record<string, unknown>>({
          data: expect.objectContaining<Record<string, unknown>>({
            perfilCompleto: true,
            qrVersion: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('4. Guard de Autenticación, Anti-IDOR y Bloqueo de Perfil', () => {
    it('debe bloquear con 403 PERFIL_INCOMPLETO rutas no exentas si debeConfigurarPerfil=true', async () => {
      const token = jwtService.sign(
        { sub: 10, sessionId: 'ses-123' },
        { secret: jwtSecret },
      );

      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        sessionId: 'ses-123',
        deletedAt: null,
        debeConfigurarPerfil: true,
        roles: [{ rol: { nombre: 'Estudiante' } }],
        estudiante: { id: 1, cod_sis: '202012345', perfilCompleto: false },
      });

      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        originalUrl: '/estudiantes/me/examenes',
        params: {},
        query: {},
        body: {},
      } as unknown as EstudianteRequest;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        /completar la configuración de tu perfil/,
      );
    });

    it('debe permitir acceso a rutas exentas (/perfil, /foto, /password) aun con perfil incompleto', async () => {
      const token = jwtService.sign(
        { sub: 10, sessionId: 'ses-123' },
        { secret: jwtSecret },
      );

      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        sessionId: 'ses-123',
        deletedAt: null,
        debeConfigurarPerfil: true,
        roles: [{ rol: { nombre: 'Estudiante' } }],
        estudiante: { id: 1, cod_sis: '202012345', perfilCompleto: false },
      });

      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        originalUrl: '/estudiantes/me/perfil',
        params: {},
        query: {},
        body: {},
      } as unknown as EstudianteRequest;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      } as unknown as ExecutionContext;

      const permitido = await guard.canActivate(mockContext);
      expect(permitido).toBe(true);
      expect(mockReq.estudiante?.estudianteId).toBe(1);
    });

    it('debe permitir acceso a /estudiantes/me/cambiar-password cuando debeConfigurarPerfil=true y completar el perfil', async () => {
      const token = jwtService.sign(
        { sub: 10, sessionId: 'ses-123' },
        { secret: jwtSecret },
      );

      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        sessionId: 'ses-123',
        password: await bcrypt.hash('ci123456', 10),
        deletedAt: null,
        debeConfigurarPerfil: true,
        debeCambiarPassword: true,
        roles: [{ rol: { nombre: 'Estudiante' } }],
        estudiante: {
          id: 1,
          cod_sis: '202012345',
          ci: '123456',
          perfilCompleto: false,
        },
      });

      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        originalUrl: '/estudiantes/me/cambiar-password',
        params: {},
        query: {},
        body: {
          passwordActual: 'ci123456',
          passwordNueva: 'segura123',
          confirmar: 'segura123',
        },
      } as unknown as EstudianteRequest;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      } as unknown as ExecutionContext;

      // 1. El guard debe permitir la llamada a cambiar-password sin arrojar 403
      const permitido = await guard.canActivate(mockContext);
      expect(permitido).toBe(true);
      expect(mockReq.estudiante?.usuarioId).toBe(10);

      // 2. Ejecución del servicio meService.cambiarPassword
      mockUsuarioUpdate.mockResolvedValue({
        id: 10,
        debeConfigurarPerfil: false,
        debeCambiarPassword: false,
      });
      mockEstudianteUpdate.mockResolvedValue({
        id: 1,
        perfilCompleto: true,
      });

      const resultado = await meService.cambiarPassword(10, {
        passwordActual: 'ci123456',
        passwordNueva: 'segura123',
        confirmar: 'segura123',
      });

      expect(resultado.debeConfigurarPerfil).toBe(false);
      expect(resultado.perfilCompleto).toBe(true);
      expect(mockUsuarioUpdate).toHaveBeenCalledWith(
        expect.objectContaining<Record<string, unknown>>({
          where: { id: 10 },
          data: expect.objectContaining<Record<string, unknown>>({
            debeConfigurarPerfil: false,
            debeCambiarPassword: false,
          }),
        }),
      );
    });

    it('Anti-IDOR: debe rechazar con ForbiddenException si manipulan un parámetro con id ajeno', async () => {
      const token = jwtService.sign(
        { sub: 10, sessionId: 'ses-123' },
        { secret: jwtSecret },
      );

      mockUsuarioFindUnique.mockResolvedValue({
        id: 10,
        sessionId: 'ses-123',
        deletedAt: null,
        debeConfigurarPerfil: false,
        roles: [{ rol: { nombre: 'Estudiante' } }],
        estudiante: { id: 1, cod_sis: '202012345', perfilCompleto: true },
      });

      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        originalUrl: '/estudiantes/me/examenes',
        params: { estudianteId: 999 }, // ID de otro estudiante manipulado
        query: {},
        body: {},
      } as unknown as EstudianteRequest;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
