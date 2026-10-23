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

describe('UT2-HU8: Endpoints de ingreso manual (e2e integration)', () => {
  let app: INestApplication;
  let server: Server;

  const mockExamen = {
    id: 1,
    estado: EstadoExamen.PROGRAMADO,
    ambiente: { nombre: 'Sala 204' },
  };

  const mockEstudianteHabilitado = {
    id: 10,
    cod_sis: '202110234',
    ci: '8765432',
    nombre: 'Valentina',
    apellido: 'Pérez',
  };

  const mockInscripcionHabilitada = {
    estudianteId: 10,
    examenId: 1,
    estado_habilitado: true,
    motivo_inhabilitacion: null,
  };

  const prismaMock = {
    modulo: { findFirst: jest.fn().mockResolvedValue({ activo: true }) },
    examen: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 1) return Promise.resolve(mockExamen);
        return Promise.resolve(null);
      }),
    },
    estudiante: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const id = where.OR?.[0]?.cod_sis || where.OR?.[1]?.ci;
        if (id === '202110234' || id === '8765432')
          return Promise.resolve(mockEstudianteHabilitado);
        if (id === '202111884') {
          return Promise.resolve({
            id: 20,
            cod_sis: '202111884',
            ci: '9999999',
            nombre: 'Rodrigo',
            apellido: 'Torrico',
          });
        }
        return Promise.resolve(null);
      }),
    },
    examen_Estudiante: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const estId = where.estudianteId_examenId?.estudianteId;
        if (estId === 10) return Promise.resolve(mockInscripcionHabilitada);
        if (estId === 20) {
          return Promise.resolve({
            estudianteId: 20,
            examenId: 1,
            estado_habilitado: false,
            motivo_inhabilitacion: 'No cumple asistencia requerida',
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
          id: 101,
          estudianteId: data.estudianteId,
          examenId: data.examenId,
          registradoPor: data.registradoPor,
          fechaHora: new Date('2026-10-23T10:00:00Z'),
          metodo: 'MANUAL',
          esOffline: false,
          clienteSyncId: data.clienteSyncId,
          estudiante: mockEstudianteHabilitado,
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
              token === 'Bearer allowed'
                ? ['control_ingreso.registro_manual']
                : [],
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

  // Caso 1: Registro de estudiante habilitado
  it('1. Registro de estudiante habilitado: 201/200 y registro persistido con hora del servidor', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue(null);

    const res = await request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer allowed')
      .send({
        examenId: 1,
        identificador: '202110234',
        clienteSyncId: 'sync-uuid-1',
      })
      .expect(200);

    expect(res.body.mensaje).toContain('exitosamente');
    expect(res.body.ingreso).toBeDefined();
    expect(prismaMock.ingreso.create).toHaveBeenCalled();
  });

  // Caso 2: Estudiante ya registrado (doble marcación)
  it('2. Estudiante ya registrado: Segunda respuesta 409 y registro de incidencia', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue({
      id: 50,
      estudianteId: 10,
      examenId: 1,
    });

    const res = await request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer allowed')
      .send({
        examenId: 1,
        identificador: '202110234',
      })
      .expect(409);

    expect(res.body.message).toContain('ya registró su ingreso');
    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalled();
  });

  // Caso 3: Estudiante no habilitado
  it('3. Estudiante no habilitado: 400 Bad Request con el motivo y registro de incidencia', async () => {
    prismaMock.ingreso.findFirst.mockResolvedValue(null);

    const res = await request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer allowed')
      .send({
        examenId: 1,
        identificador: '202111884',
      })
      .expect(400);

    expect(res.body.message).toContain('Estudiante no habilitado');
    expect(prismaMock.incidenciaIngreso.create).toHaveBeenCalled();
  });

  // Caso 4: Usuario sin permiso
  it('4. Usuario sin permiso: 403 Forbidden y sin registro creado', async () => {
    await request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer denied')
      .send({
        examenId: 1,
        identificador: '202110234',
      })
      .expect(403);

    expect(prismaMock.ingreso.create).not.toHaveBeenCalled();
  });

  // Caso 5: Peticiones simultáneas del mismo estudiante
  it('5. Peticiones simultáneas del mismo estudiante: Un 200 y un 409', async () => {
    let llamado = false;
    prismaMock.ingreso.findFirst.mockImplementation(() => {
      if (llamado) {
        return Promise.resolve({ id: 99 });
      }
      llamado = true;
      return Promise.resolve(null);
    });

    const req1 = request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer allowed')
      .send({ examenId: 1, identificador: '202110234', clienteSyncId: 'p1' });

    const req2 = request(server)
      .post('/ingresos/manual')
      .set('Authorization', 'Bearer allowed')
      .send({ examenId: 1, identificador: '202110234', clienteSyncId: 'p2' });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status].sort();

    expect(statuses).toEqual([200, 409]);
  });
});
