/// <reference types="jest" />
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HU15 integración Exámenes y reservas (Prisma sustituido)', () => {
  let db: ReturnType<typeof crearDb>;
  let service: ExamenesService;
  const reserva = {
    id: 4,
    docenteId: 7,
    ambienteId: 2,
    estado: 'RESERVADO',
    fecha: new Date('2026-10-15T00:00:00Z'),
    ambiente: { estadoAula: 'DISPONIBLE' },
    examenes: [],
  };
  const crearDb = () => ({
    $queryRaw: jest
      .fn<Promise<unknown>, unknown[]>()
      .mockResolvedValue([{ id: 2 }]),
    $transaction: jest.fn<
      Promise<unknown>,
      [(client: unknown) => Promise<unknown>]
    >(),
    reservaAmbiente: {
      findUnique: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue(reserva),
      findMany: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
    },
    carrera_Materia: {
      findFirst: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue({ carreraId: 1 }),
    },
    examen: {
      create: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue({ id: 8 }),
      findUnique: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue({
        id: 8,
        usuarioId: 7,
        reservaAmbienteId: 4,
        tipoExamen: 'Parcial',
        creadoEn: new Date(),
        reservaAmbiente: { ambiente: { id: 2 }, fecha: reserva.fecha },
        carrerasMaterias: [],
        _count: { estudiantes: 0 },
      }),
      delete: jest.fn<Promise<unknown>, unknown[]>(),
    },
    examen_Carrera_Materia: {
      create: jest.fn<Promise<unknown>, unknown[]>(),
      deleteMany: jest.fn<Promise<unknown>, unknown[]>(),
    },
    ingreso: {
      deleteMany: jest
        .fn<Promise<unknown>, unknown[]>()
        .mockResolvedValue({ count: 0 }),
    },
  });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T16:00:00Z'));
    db = crearDb();
    db.$transaction.mockImplementation((fn) => fn(db));
    service = new ExamenesService(db as unknown as PrismaService);
  });
  afterEach(() => jest.useRealTimers());
  it('asocia examen a reserva propia y comprueba después del bloqueo', async () => {
    await service.create(
      { materiaId: 1, tipoExamen: 'Parcial', reservaAmbienteId: 4 },
      7,
      true,
    );
    expect(db.examen.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reservaAmbienteId: 4,
          usuarioId: 7,
        }) as unknown,
      }),
    );
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.examen.create.mock.invocationCallOrder[0],
    );
  });
  it('no permite dos exámenes en la misma reserva', async () => {
    db.reservaAmbiente.findUnique.mockResolvedValue({
      ...reserva,
      examenes: [{ id: 99 }],
    });
    await expect(
      service.create(
        { materiaId: 1, tipoExamen: 'Parcial', reservaAmbienteId: 4 },
        7,
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.examen.create).not.toHaveBeenCalled();
  });
  it('no permite reserva ajena ni para administrador', async () => {
    await expect(
      service.create(
        { materiaId: 1, tipoExamen: 'Parcial', reservaAmbienteId: 4 },
        8,
        true,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('revalida cancelación de reserva antes de asociar', async () => {
    db.reservaAmbiente.findUnique
      .mockResolvedValueOnce(reserva)
      .mockResolvedValueOnce({ ...reserva, estado: 'CANCELADO' });
    await expect(
      service.create(
        { materiaId: 1, tipoExamen: 'Parcial', reservaAmbienteId: 4 },
        7,
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('selector filtra por docenteId y reserva activa', async () => {
    await service.getMisAmbientes(7);
    expect(db.reservaAmbiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          docenteId: 7,
          estado: 'RESERVADO',
          examenes: { none: {} },
        }) as unknown,
      }),
    );
  });
  it('eliminar examen no modifica ni elimina la reserva', async () => {
    await service.remove(8, 7);
    expect(db.examen.delete).toHaveBeenCalledWith({ where: { id: 8 } });
    expect(db.reservaAmbiente.findUnique).not.toHaveBeenCalled();
    expect(db.reservaAmbiente.findMany).not.toHaveBeenCalled();
  });
});
