import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const QR_SECRET = process.env.QR_SECRET ?? 'dev-qr-secret';
const QR_VIGENCIA_SEG = 5 * 60; // 5 minutos
const MAX_QR_POR_HORA = 10;
const UNA_HORA_MS = 60 * 60 * 1000;

@Injectable()
export class QrTokenService {
  private generacionesPorEstudiante = new Map<number, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Genera un QR de acceso temporal.
   * Reglas:
   * - El token NO incluye el CI.
   * - Solo 1 QR activo a la vez por estudiante (revoca/elimina anteriores).
   * - Límite de 10 generaciones por hora por estudiante.
   */
  async generar(estudianteId: number) {
    const ahoraMs = Date.now();
    const timestamps = this.generacionesPorEstudiante.get(estudianteId) ?? [];
    const recientes = timestamps.filter((t) => t > ahoraMs - UNA_HORA_MS);

    if (recientes.length >= MAX_QR_POR_HORA) {
      throw new HttpException(
        'Límite de generación de QR alcanzado (máximo 10 por hora). Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recientes.push(ahoraMs);
    this.generacionesPorEstudiante.set(estudianteId, recientes);

    const ahora = new Date(ahoraMs);
    const expiraEn = new Date(ahoraMs + QR_VIGENCIA_SEG * 1000);

    const token = this.jwt.sign(
      { sub: estudianteId, jti: randomUUID(), tipo: 'qr' },
      { secret: QR_SECRET, expiresIn: QR_VIGENCIA_SEG },
    );

    // Invalida cualquier QR previo del estudiante para mantener solo 1 activo
    await this.prisma.codigoQr.deleteMany({
      where: { estudianteId },
    });

    await this.prisma.codigoQr.create({
      data: { estudianteId, token, generadoEn: ahora, expiraEn },
    });

    return token;
  }

  /** Devuelve el estudianteId o lanza QR_INVALIDO / QR_CADUCADO. */
  async validar(token: string): Promise<number> {
    let payload: { sub?: number; jti?: string; tipo?: string };
    try {
      payload = this.jwt.verify(token, { secret: QR_SECRET });
    } catch (e: unknown) {
      const err = e as { name?: string };
      const caducado = err?.name === 'TokenExpiredError';
      throw new UnauthorizedException({
        codigo: caducado ? 'QR_CADUCADO' : 'QR_INVALIDO',
        message: caducado ? 'El QR ha caducado' : 'El QR no es válido',
      });
    }

    if (payload.tipo !== 'qr' || !payload.sub) {
      throw new UnauthorizedException({
        codigo: 'QR_INVALIDO',
        message: 'El QR no es válido',
      });
    }

    const fila = await this.prisma.codigoQr.findUnique({ where: { token } });
    if (!fila || fila.estudianteId !== Number(payload.sub)) {
      throw new UnauthorizedException({
        codigo: 'QR_INVALIDO',
        message: 'El QR no es válido o ha sido revocado',
      });
    }

    if (fila.expiraEn < new Date()) {
      throw new UnauthorizedException({
        codigo: 'QR_CADUCADO',
        message: 'El QR ha caducado',
      });
    }

    return fila.estudianteId;
  }
}