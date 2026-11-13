import { JwtService } from '@nestjs/jwt';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Request } from 'express';
import type { Server } from 'node:http';
import { IngresosController } from '../src/ingresos/ingresos.controller';
import { IngresosService } from '../src/ingresos/ingresos.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { EstadoExamen } from '@prisma/client';

describe('UT03-HU09: Prueba de Integración End-to-End del flujo de escaneo y registro QR', () => {
  let app: INestApplication;
  let server: Server;

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

  const validToken = new JwtService().sign(
    { sub: 5, examenId: 1, tipo: 'examen' },
    { secret: process.env.QR_SECRET ?? 'dev-qr-secret', expiresIn: '1h' },
  );
  const expiredToken = new JwtService().sign(
    { sub: 5, examenId: 1, tipo: 'examen', jti: 'expired' },
    { secret: process.env.QR_SECRET ?? 'dev-qr-secret', expiresIn: '1h' },
  );
  const mockQrVigente = {
    id: 10,
    token: validToken,
    estudianteId: 5,
    examenId: 1,
    expiraEn: new Date(Date.now() + 60 * 60 * 1000), // Vigente por 1 hora
    estudiante: mockEstudiante,
  };

  const mockQrExpirado = {
    id: 11,
    token: expiredToken,
    estudianteId: 5,
    examenId: 1,
    expiraEn: new Date(Date.now() - 10 * 60 * 1000), // Expirado hace 10 min
    estudiante: mockEstudiante,
  };

  const prismaMock = {
    usuario: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ roles: [{ rol: { nombre: 'Administrador' } }] }),
    },
    fotoEstudiante: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ archivo: '/uploads/estudiantes/original.jpg' }),
    },
    modulo: { findFirst: jest.fn().mockResolvedValue({ activo: true }) },
    examen: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 1) return Promise.resolve(mockExamen);
        return Promise.resolve(null);
      }),
    },
    codigoQr: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.token === validToken) return Promise.resolve(mockQrVigente);
        if (where.token === expiredToken)
          return Promise.resolve(mockQrExpirado);
        return Promise.resolve(null);
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    examen_Estudiante: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.estudianteId_examenId?.estudianteId === 5) {
          return Promise.resolve({
            estudianteId: 5,
            examenId: 1,
            estado_habilitado: true,
            motivo_inhabilitacion: null,
          });
        }
        return Promise.resolve(null);
      }),
    },
    ingreso: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 201,
          estudianteId: data.estudianteId,
          examenId: data.examenId,
          registradoPor: data.registradoPor,
          fechaHora: new Date('2026-10-23T10:00:00Z'),
          metodo: 'QR',
          esOffline: false,
          clienteSyncId: data.clienteSyncId,
          estudiante: mockEstudiante,
          examen: { id: 1, tipoExamen: 'Primer parcial' },
        }),
      ),
    },
    incidenciaIngreso: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [IngresosController],
      providers: [
        IngresosService,
        PermissionsGuard,
        { provide: PrismaService, useValue: prismaMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<
              Request & { user: { id: number; permisos: string[] } }
            >();
          if (!req.headers.authorization) throw new UnauthorizedException();
          const token = req.headers.authorization;
          req.user = {
            id: 2,
            permisos:
              token === 'Bearer allowed' ? ['control_ingreso.escanear_qr'] : [],
          };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Caso 1: Petición HTTP con QR válido
  it('1. Petición HTTP con QR válido: Status 200 OK, body con mensaje de éxito e ingreso persistido en BD', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue(null);

    const res = await request(server)
      .post('/ingresos/qr/confirmar')
      .set('Authorization', 'Bearer allowed')
      .send({
        examenId: 1,
        token: validToken,
        clienteSyncId: 'sync-qr-1',
      })
      .expect(200);

    expect(res.body.mensaje).toContain('exitosamente');
    expect(res.body.ingreso).toBeDefined();
    expect(prismaMock.ingreso.create).toHaveBeenCalled();
  });

  it('HU23: el escaneo HTTP solo muestra datos, sin persistir ingreso', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue(null);
    const res = await request(server)
      .post('/ingresos/qr')
      .set('Authorization', 'Bearer allowed')
      .send({ examenId: 1, token: validToken })
      .expect(200);
    expect(res.body.estudiante.requiereConfirmacion).toBe(true);
    expect(prismaMock.ingreso.create).not.toHaveBeenCalled();
    expect(prismaMock.codigoQr.updateMany).not.toHaveBeenCalled();
  });
  it('HU23: un usuario sin permiso no puede escanear ni confirmar', async () => {
    for (const route of ['/ingresos/qr', '/ingresos/qr/confirmar']) {
      await request(server)
        .post(route)
        .set('Authorization', 'Bearer denied')
        .send({ examenId: 1, token: validToken })
        .expect(403);
    }
    expect(prismaMock.ingreso.create).not.toHaveBeenCalled();
  });

  // Caso 2: Petición HTTP con QR expirado
  it('2. Petición HTTP con QR expirado: Status 400 Bad Request, registro de incidencia en BD', async () => {
    const res = await request(server)
      .post('/ingresos/qr/confirmar')
      .set('Authorization', 'Bearer allowed')
      .send({
        examenId: 1,
        token: expiredToken,
      })
      .expect(400);

    expect(res.body.message).toContain('expirado');
    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalled();
  });

  // Caso 3: Petición HTTP duplicada consecutiva
  it('3. Petición HTTP duplicada consecutiva: Primera respuesta 200 OK, segunda respuesta 409 Conflict', async () => {
    let llamado = false;
    prismaMock.ingreso.findFirst.mockImplementation(() => {
      if (llamado) {
        return Promise.resolve({ id: 50, estudianteId: 5 });
      }
      llamado = true;
      return Promise.resolve(null);
    });

    const res1 = await request(server)
      .post('/ingresos/qr/confirmar')
      .set('Authorization', 'Bearer allowed')
      .send({ examenId: 1, token: validToken })
      .expect(200);

    const res2 = await request(server)
      .post('/ingresos/qr/confirmar')
      .set('Authorization', 'Bearer allowed')
      .send({ examenId: 1, token: validToken })
      .expect(409);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(409);
    expect(res2.body.message).toContain('ya registró su ingreso');
  });

  // Caso 4: Petición HTTP sin autenticación
  it('4. Petición HTTP sin autenticación: Status 401 Unauthorized', async () => {
    await request(server)
      .post('/ingresos/qr/confirmar')
      .send({ examenId: 1, token: validToken })
      .expect(401);

    expect(prismaMock.ingreso.create).not.toHaveBeenCalled();
  });
});
