import { QrExamenService } from './qr-examen.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('original')),
}));

describe('HU23: autorización facial para cada emisión', () => {
  const prisma = {
    examen_Estudiante: { findFirst: jest.fn() },
    fotoEstudiante: { findFirst: jest.fn() },
  };
  const qr = { generarParaExamen: jest.fn().mockResolvedValue('signed-token') };
  const facial = { comparar: jest.fn(), detectarRostros: jest.fn() };
  const selfie = {
    buffer: Buffer.from('selfie'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;
  const service = new QrExamenService(
    prisma as unknown as PrismaService,
    qr as unknown as QrTokenService,
    facial,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T15:00:00Z'));
    prisma.examen_Estudiante.findFirst.mockResolvedValue({
      estado_habilitado: true,
      examen: {
        estado: 'PROGRAMADO',
        reservaAmbiente: {
          fecha: new Date('2026-11-10'),
          horarioFijo: {
            horaIni: new Date('1970-01-01T12:00:00Z'),
            horaFin: new Date('1970-01-01T14:00:00Z'),
          },
        },
      },
    });
    prisma.fotoEstudiante.findFirst.mockResolvedValue({
      archivo: '/uploads/estudiantes/original.jpg',
    });
    facial.comparar.mockResolvedValue({
      rostrosDetectados: 1,
      rostrosDetectadosBase: 1,
      similitud: 0.8,
    });
  });
  afterEach(() => jest.useRealTimers());

  it('rechaza generación sin selfie y no emite token', async () => {
    await expect(service.generar(5, 10)).rejects.toMatchObject({ status: 400 });
    expect(qr.generarParaExamen).not.toHaveBeenCalled();
  });
  it('consulta solo la referencia activa del estudiante autenticado y verifica cada emisión', async () => {
    await service.generar(5, 10, selfie);
    await service.generar(5, 10, selfie);
    expect(prisma.fotoEstudiante.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estudianteId: 5, estado: 'ACTIVA' } }),
    );
    expect(facial.comparar).toHaveBeenCalledTimes(2);
    expect(qr.generarParaExamen).toHaveBeenCalledTimes(2);
  });
  it.each([
    { rostrosDetectados: 0, rostrosDetectadosBase: 1, similitud: null },
    { rostrosDetectados: 1, rostrosDetectadosBase: 1, similitud: 0.1 },
    { rostrosDetectados: 2, rostrosDetectadosBase: 1, similitud: 0.9 },
  ])(
    'rechaza discrepancia o cantidad de rostros inválida: %j',
    async (resultado) => {
      facial.comparar.mockResolvedValue(resultado);
      await expect(service.generar(5, 10, selfie)).rejects.toMatchObject({
        status: 403,
      });
      expect(qr.generarParaExamen).not.toHaveBeenCalled();
    },
  );
  it('rechaza estudiantes no habilitados', async () => {
    prisma.examen_Estudiante.findFirst.mockResolvedValue(null);
    await expect(service.generar(5, 10, selfie)).rejects.toMatchObject({
      status: 403,
    });
    expect(facial.comparar).not.toHaveBeenCalled();
  });
  it('no emite QR si falta la referencia original', async () => {
    prisma.fotoEstudiante.findFirst.mockResolvedValue(null);
    await expect(service.generar(5, 10, selfie)).rejects.toMatchObject({
      status: 409,
    });
    expect(facial.comparar).not.toHaveBeenCalled();
    expect(qr.generarParaExamen).not.toHaveBeenCalled();
  });
  it('falla cerrado si el motor no responde', async () => {
    facial.comparar.mockRejectedValue(new Error('MOTOR_NO_DISPONIBLE'));
    await expect(service.generar(5, 10, selfie)).rejects.toMatchObject({
      status: 503,
    });
    expect(qr.generarParaExamen).not.toHaveBeenCalled();
  });
});
