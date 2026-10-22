/// <reference types="jest" />
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
import { AmbientesController } from '../src/ambientes/ambientes.controller';
import { AmbientesService } from '../src/ambientes/ambientes.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';

// Integración HTTP del controlador, ValidationPipe, servicio y PermissionsGuard.
// Prisma y la autenticación se sustituyen; nunca conecta ni modifica PostgreSQL.
describe('HU10 HTTP (persistencia sustituida)', () => {
  let app: INestApplication;
  const prisma = {
    modulo: { findFirst: jest.fn().mockResolvedValue({ activo: true }) },
    usuario: {
      findUnique: jest.fn().mockResolvedValue({
        deletedAt: null,
        roles: [],
        alcances: [{ facultadId: 4 }],
      }),
    },
    ambiente: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          nombre: 'Sala 204',
          capacidad: 40,
          facultadId: 4,
          tipoAulaId: 1,
          facultad: { nombre: 'Facultad 4' },
          tipoAula: { nombre: 'Aula' },
          estadoAula: 'DISPONIBLE',
        },
      ]),
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 1, estadoAula: 'DISPONIBLE' }),
    },
    horarioFijo: { findMany: jest.fn().mockResolvedValue([]) },
    reservaAmbiente: { findMany: jest.fn().mockResolvedValue([]) },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AmbientesController],
      providers: [
        AmbientesService,
        PermissionsGuard,
        { provide: PrismaService, useValue: prisma },
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
          req.user = {
            id: 2,
            permisos:
              req.headers.authorization === 'Bearer allowed'
                ? ['ambientes.ver']
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
  });
  afterAll(async () => app?.close());
  it('no permite solicitudes sin identidad', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes')
      .expect(401));
  it('rechaza usuario sin ambientes.ver', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes')
      .set('Authorization', 'Bearer denied')
      .expect(403));
  it('lista usando el contrato oficial', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes')
      .set('Authorization', 'Bearer allowed')
      .expect(200)
      .expect([
        {
          id: 1,
          nombre: 'Sala 204',
          capacidad: 40,
          facultadId: 4,
          tipoAulaId: 1,
          facultad: 'Facultad 4',
          tipoAula: 'Aula',
          estado: 'HABILITADO',
        },
      ]));
  it('rechaza ID inválido', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes/abc/disponibilidad?fecha=2026-10-15')
      .set('Authorization', 'Bearer allowed')
      .expect(400));
  it('rechaza ID no positivo', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes/0')
      .set('Authorization', 'Bearer allowed')
      .expect(400));
  it('rechaza fecha ausente', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes/1/disponibilidad')
      .set('Authorization', 'Bearer allowed')
      .expect(400));
  it('rechaza fecha imposible', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes/1/disponibilidad?fecha=2026-02-30')
      .set('Authorization', 'Bearer allowed')
      .expect(400));
  it('rechaza parámetros adicionales', () =>
    request(app.getHttpServer() as Server)
      .get('/ambientes/1/disponibilidad?fecha=2026-10-15&docenteId=1')
      .set('Authorization', 'Bearer allowed')
      .expect(400));
  it('bloquea módulos desactivados', async () => {
    prisma.modulo.findFirst.mockResolvedValueOnce({ activo: false });
    await request(app.getHttpServer() as Server)
      .get('/ambientes')
      .set('Authorization', 'Bearer allowed')
      .expect(403);
  });
});
