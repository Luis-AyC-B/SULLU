/// <reference types="jest" />
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AmbientesService } from '../ambientes/ambientes.service';

describe('HU15 ReservasService', () => {
  const dto = { ambienteId: 1, horarioFijoId: 2, fecha: '2026-10-15' };
  const completa = {
    id: 3,
    ambienteId: 1,
    docenteId: 7,
    horarioFijoId: 2,
    fecha: new Date('2026-10-15T00:00:00Z'),
    estado: 'RESERVADO',
    ambiente: { nombre: 'Sala 204', facultad: { nombre: 'FCyT' } },
    horarioFijo: {
      periodoNombre: 'Periodo 2',
      horaIni: new Date('1970-01-01T08:15:00Z'),
      horaFin: new Date('1970-01-01T09:45:00Z'),
    },
    examenes: [],
  };
  let tx: ReturnType<typeof crearTx>;
  let db: ReturnType<typeof crearDb>;
  let ambientes: ReturnType<typeof crearAmbientes>;
  let service: ReservasService;
  const crearTx = () => ({
    $queryRaw: jest
      .fn<Promise<unknown>, unknown[]>()
      .mockResolvedValue([{ id: 1 }]),
    reservaAmbiente: {
      create: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue(completa),
      findFirst: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue(completa),
      update: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue({}),
    },
  });
  const crearDb = () => ({
    $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) =>
      fn(tx),
    ),
    usuario: {
      findUnique: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue({ deletedAt: null }),
    },
    reservaAmbiente: {
      findFirst: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue(completa),
      findMany: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue([completa]),
    },
  });
  const crearAmbientes = () => ({
    findOne: jest
      .fn<Promise<unknown>, unknown[]>()
      .mockResolvedValue({ id: 1 }),
    disponibilidad: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue({
      periodos: [{ horarioFijoId: 2, disponibilidad: 'LIBRE' }],
    }),
  });
  beforeEach(() => {
    tx = crearTx();
    db = crearDb();
    ambientes = crearAmbientes();
    service = new ReservasService(
      db as unknown as PrismaService,
      ambientes as unknown as AmbientesService,
    );
  });
  it('persiste docente JWT y datos reales; no confía en nombres de entrada', async () => {
    const result = await service.create(
      { ...dto, ambienteNombre: 'Falso', periodoNombre: 'Falso' },
      7,
    );
    expect(tx.reservaAmbiente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ambienteId: 1,
          docenteId: 7,
          horarioFijoId: 2,
          fecha: new Date('2026-10-15T00:00:00Z'),
          estado: 'RESERVADO',
        },
      }),
    );
    expect(result).toMatchObject({
      ambienteNombre: 'Sala 204',
      periodoNombre: 'Periodo 2',
      tieneExamenAsignado: false,
      examenAsociado: null,
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      ambientes.disponibilidad.mock.invocationCallOrder[0],
    );
    expect(ambientes.disponibilidad).toHaveBeenCalledWith(1, dto.fecha, 7, tx);
  });
  it('rechaza alcance antes de iniciar transacción', async () => {
    ambientes.findOne.mockRejectedValue(new ForbiddenException());
    await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('rechaza periodo ocupado y no inserta', async () => {
    ambientes.disponibilidad.mockResolvedValue({
      periodos: [{ horarioFijoId: 2, disponibilidad: 'RESERVADO' }],
    });
    await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.reservaAmbiente.create).not.toHaveBeenCalled();
  });
  it('rechaza periodo no aplicable', async () => {
    ambientes.disponibilidad.mockResolvedValue({ periodos: [] });
    await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('lista solo reservas activas del usuario', async () => {
    await service.misReservas(7);
    expect(db.reservaAmbiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { docenteId: 7, estado: 'RESERVADO' } }),
    );
  });
  it('rechaza usuario inactivo', async () => {
    db.usuario.findUnique.mockResolvedValue({ deletedAt: new Date() });
    await expect(service.misReservas(7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('cancelación conserva el registro mediante cambio de estado', async () => {
    await service.cancelar(3, 7);
    expect(tx.reservaAmbiente.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { estado: 'CANCELADO' },
    });
    expect(db.reservaAmbiente.findFirst).toHaveBeenCalledWith({
      where: { id: 3, docenteId: 7 },
    });
  });
  it('no cancela reservas ajenas', async () => {
    db.reservaAmbiente.findFirst.mockResolvedValue(null);
    await expect(service.cancelar(3, 8)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.reservaAmbiente.update).not.toHaveBeenCalled();
  });
  it.each(['PROGRAMADO', 'EN_CURSO', 'FINALIZADO'])(
    'bloquea cancelación con examen %s',
    async (estado) => {
      tx.reservaAmbiente.findFirst.mockResolvedValue({
        ...completa,
        examenes: [{ estado }],
      });
      await expect(service.cancelar(3, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.reservaAmbiente.update).not.toHaveBeenCalled();
    },
  );
  it('permite cancelación con examen cancelado', async () => {
    tx.reservaAmbiente.findFirst.mockResolvedValue({
      ...completa,
      examenes: [{ estado: 'CANCELADO' }],
    });
    await service.cancelar(3, 7);
    expect(tx.reservaAmbiente.update).toHaveBeenCalled();
  });
  it('cancelación repetida es idempotente', async () => {
    tx.reservaAmbiente.findFirst.mockResolvedValue({
      ...completa,
      estado: 'CANCELADO',
    });
    await service.cancelar(3, 7);
    expect(tx.reservaAmbiente.update).not.toHaveBeenCalled();
  });
  it('dos solicitudes serializadas vuelven a consultar; solo una inserta (simulación de bloqueo)', async () => {
    let occupied = false;
    let tail = Promise.resolve();
    db.$transaction.mockImplementation((fn) => {
      const operation = tail.then(() => fn(tx));
      tail = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    });
    ambientes.disponibilidad.mockImplementation(() =>
      Promise.resolve({
        periodos: [
          {
            horarioFijoId: 2,
            disponibilidad: occupied ? 'RESERVADO' : 'LIBRE',
          },
        ],
      }),
    );
    tx.reservaAmbiente.create.mockImplementation(() => {
      occupied = true;
      return Promise.resolve(completa);
    });
    const results = await Promise.allSettled([
      service.create(dto, 7),
      service.create(dto, 8),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(tx.reservaAmbiente.create).toHaveBeenCalledTimes(1);
    // Esta prueba valida el algoritmo; el bloqueo PostgreSQL requiere prueba con una BD aislada.
  });
});
