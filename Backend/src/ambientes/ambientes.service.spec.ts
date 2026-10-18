/// <reference types="jest" />
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AmbientesService, fechasPermitidas } from './ambientes.service';

describe('HU10 AmbientesService', () => {
  const usuario = { deletedAt: null, roles: [], alcances: [{ facultadId: 4 }] };
  const hora = (s: string) => new Date(`1970-01-01T${s}:00Z`);
  const periodo = (
    id: number,
    ini: string,
    fin: string,
    diaSemana: string | null = null,
  ) => ({
    id,
    periodoNombre: `Periodo ${id}`,
    horaIni: hora(ini),
    horaFin: hora(fin),
    diaSemana,
  });
  let prisma: {
    usuario: { findUnique: jest.Mock };
    ambiente: {
      findMany: jest.Mock<Promise<unknown>, unknown[]>;
      findFirst: jest.Mock;
    };
    horarioFijo: { findMany: jest.Mock };
    reservaAmbiente: { findMany: jest.Mock };
  };
  let service: AmbientesService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T16:00:00Z'));
    prisma = {
      usuario: {
        findUnique: jest
          .fn<Promise<unknown>, unknown[]>()
          .mockResolvedValue(usuario),
      },
      ambiente: {
        findMany: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
        findFirst: jest
          .fn<Promise<unknown>, unknown[]>()
          .mockResolvedValue({ id: 1, estadoAula: 'DISPONIBLE' }),
      },
      horarioFijo: {
        findMany: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
      },
      reservaAmbiente: {
        findMany: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
      },
    };
    service = new AmbientesService(prisma as unknown as PrismaService);
  });
  afterEach(() => jest.useRealTimers());
  it('limita facultades sin esconder laboratorios', async () => {
    await service.findAll(2);
    expect(prisma.ambiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { facultadId: { in: [4] } } }),
    );
  });
  it('administrador activo tiene acceso total', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      roles: [{ rolId: 1 }],
    });
    await service.findAll(1);
    expect(prisma.ambiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
  it('sin alcance no permite consultar ambientes', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ ...usuario, alcances: [] });
    await service.findAll(2);
    expect(prisma.ambiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { facultadId: { in: [] } } }),
    );
  });
  it('deriva facultad desde carrera y materia', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      alcances: [
        { carrera: { facultadId: 3 } },
        { materia: { carreras: [{ carrera: { facultadId: 5 } }] } },
      ],
    });
    await service.findAll(2);
    expect(prisma.ambiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { facultadId: { in: [3, 5] } } }),
    );
  });
  it('rechaza usuarios inactivos', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      deletedAt: new Date(),
    });
    await expect(service.findAll(2)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('no expone ambientes fuera de alcance', async () => {
    prisma.ambiente.findFirst.mockResolvedValue(null);
    await expect(service.findOne(99, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([0, -1, 1.5])('rechaza identificador %s', async (id) => {
    await expect(service.findOne(id, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it.each([
    '2026-10-10',
    '2026-11-12',
    '2026-10-32',
    '2026-02-30',
    'invalid',
    '2026-10-12T12:00:00Z',
  ])('rechaza fecha %s', async (fecha) => {
    await expect(service.disponibilidad(1, fecha, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.reservaAmbiente.findMany).not.toHaveBeenCalled();
  });
  it.each(['2026-10-11', '2026-11-11'])(
    'incluye el límite %s',
    async (fecha) => {
      await expect(service.disponibilidad(1, fecha, 2)).resolves.toMatchObject({
        fecha,
      });
    },
  );
  it.each(['INHABILITADO', 'EN_REMODELACION', 'MANTENIMIENTO', 'RESERVADO'])(
    'rechaza ambiente %s',
    async (estadoAula) => {
      prisma.ambiente.findFirst.mockResolvedValue({ id: 1, estadoAula });
      await expect(
        service.disponibilidad(1, '2026-10-11', 2),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
  it('marca solapamientos; periodos contiguos quedan libres; filtra por día', async () => {
    prisma.horarioFijo.findMany.mockResolvedValue([
      periodo(1, '08:00', '09:00'),
      periodo(2, '09:00', '10:00'),
      periodo(3, '10:00', '11:00'),
      periodo(4, '11:00', '12:00', 'Lunes'),
      periodo(5, '12:00', '13:00', 'Domingo'),
    ]);
    prisma.reservaAmbiente.findMany.mockResolvedValue([
      { horarioFijo: periodo(9, '08:30', '10:00') },
    ]);
    const result = await service.disponibilidad(1, '2026-10-11', 2);
    expect(
      result.periodos.map((p) => [p.horarioFijoId, p.disponibilidad]),
    ).toEqual([
      [1, 'RESERVADO'],
      [2, 'RESERVADO'],
      [3, 'LIBRE'],
      [5, 'LIBRE'],
    ]);
    expect(prisma.reservaAmbiente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ambienteId: 1,
          fecha: new Date('2026-10-11T00:00:00Z'),
          estado: 'RESERVADO',
        },
      }),
    );
  });
  it('sin reservas, devuelve periodos libres sin datos del docente', async () => {
    prisma.horarioFijo.findMany.mockResolvedValue([
      periodo(1, '08:00', '09:00'),
    ]);
    const result = await service.disponibilidad(1, '2026-10-11', 2);
    expect(result.periodos).toEqual([
      {
        horarioFijoId: 1,
        periodoNombre: 'Periodo 1',
        horaIni: '08:00',
        horaFin: '09:00',
        disponibilidad: 'LIBRE',
      },
    ]);
  });
  it('ajusta fin de mes y usa fecha de La Paz', () => {
    expect(fechasPermitidas(new Date('2027-01-31T16:00:00Z'))).toEqual({
      fechaMin: '2027-01-31',
      fechaMax: '2027-02-28',
    });
    expect(fechasPermitidas(new Date('2026-10-12T02:00:00Z')).fechaMin).toBe(
      '2026-10-11',
    );
  });
  it('bloquea inhabilitación con reservas vigentes dentro de la transacción', async () => {
    const tx = {
      ...prisma,
      $queryRaw: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
      reservaAmbiente: {
        count: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue(1),
      },
      ambiente: {
        ...prisma.ambiente,
        update: jest.fn<Promise<unknown>, unknown[]>(),
      },
    };
    const db = {
      ...prisma,
      $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const instancia = new AmbientesService(db as unknown as PrismaService);
    await expect(
      instancia.updateEstado(1, 'EN_REMODELACION', 2),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ambiente.update).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled();
  });
  it('traduce HABILITADO a DISPONIBLE sin modificar reservas', async () => {
    const tx = {
      ...prisma,
      $queryRaw: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue([]),
      reservaAmbiente: { count: jest.fn<Promise<unknown>, unknown[]>() },
      ambiente: {
        ...prisma.ambiente,
        update: jest
          .fn<Promise<unknown>, unknown[]>()
          .mockResolvedValue({ id: 1, estadoAula: 'DISPONIBLE' }),
      },
    };
    const db = {
      ...prisma,
      $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    await new AmbientesService(db as unknown as PrismaService).updateEstado(
      1,
      'HABILITADO',
      2,
    );
    expect(tx.ambiente.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estadoAula: 'DISPONIBLE' } }),
    );
    expect(tx.reservaAmbiente.count).not.toHaveBeenCalled();
  });
});
