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
import { ReservasController } from '../src/reservas/reservas.controller';
import { ReservasService } from '../src/reservas/reservas.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { PrismaService } from '../src/prisma/prisma.service';
describe('HU15 HTTP (persistencia sustituida)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 9 }),
    misReservas: jest.fn().mockResolvedValue([]),
    cancelar: jest.fn().mockResolvedValue(undefined),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReservasController],
      providers: [
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: {
            modulo: {
              findFirst: jest.fn().mockResolvedValue({ activo: true }),
            },
          },
        },
        { provide: ReservasService, useValue: service },
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
            id: 7,
            permisos: [req.headers.authorization.replace('Bearer ', '')],
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
  it('requiere autenticación', () =>
    request(app.getHttpServer() as Server)
      .post('/reservas')
      .send({})
      .expect(401));
  it('no permite crear con permiso de lectura', () =>
    request(app.getHttpServer() as Server)
      .post('/reservas')
      .set('Authorization', 'Bearer ambientes.ver')
      .send({})
      .expect(403));
  it('acepta IDs texto, pero identidad solo desde JWT', async () => {
    await request(app.getHttpServer() as Server)
      .post('/reservas')
      .set('Authorization', 'Bearer ambientes.registrar_reserva')
      .send({ ambienteId: '1', horarioFijoId: '2', fecha: '2026-10-15' })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ ambienteId: 1, horarioFijoId: 2 }),
      7,
    );
  });
  it.each(['docenteId', 'usuarioId', 'facultadId', 'rol'])(
    'rechaza suplantación mediante %s',
    (field) =>
      request(app.getHttpServer() as Server)
        .post('/reservas')
        .set('Authorization', 'Bearer ambientes.registrar_reserva')
        .send({
          ambienteId: 1,
          horarioFijoId: 2,
          fecha: '2026-10-15',
          [field]: 99,
        })
        .expect(400),
  );
  it('rechaza fecha imposible', () =>
    request(app.getHttpServer() as Server)
      .post('/reservas')
      .set('Authorization', 'Bearer ambientes.registrar_reserva')
      .send({ ambienteId: 1, horarioFijoId: 2, fecha: '2026-02-30' })
      .expect(400));
  it('lista usando identidad JWT', async () => {
    await request(app.getHttpServer() as Server)
      .get('/reservas/mis-reservas')
      .set('Authorization', 'Bearer ambientes.ver')
      .expect(200)
      .expect([]);
    expect(service.misReservas).toHaveBeenCalledWith(7);
  });
  it('cancelación requiere permiso específico', () =>
    request(app.getHttpServer() as Server)
      .patch('/reservas/9/cancelar')
      .set('Authorization', 'Bearer ambientes.ver')
      .expect(403));
  it('cancela por JWT y responde sin body', async () => {
    await request(app.getHttpServer() as Server)
      .patch('/reservas/9/cancelar')
      .set('Authorization', 'Bearer ambientes.cancelar_reserva')
      .expect(204);
    expect(service.cancelar).toHaveBeenCalledWith(9, 7);
  });
});
