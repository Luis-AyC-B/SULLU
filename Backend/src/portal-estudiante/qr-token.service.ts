import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const QR_SECRET = process.env.QR_SECRET ?? 'dev-qr-secret';
const QR_VIGENCIA_SEG = 5 * 60; // 5 minutos, pendiente de confirmar

@Injectable()
export class QrTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** El token NO incluye el CI. */
  async generar(estudianteId: number) {
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + QR_VIGENCIA_SEG * 1000);
    const token = this.jwt.sign(
      { sub: estudianteId, jti: randomUUID(), tipo: 'qr' },
      { secret: QR_SECRET, expiresIn: QR_VIGENCIA_SEG },
    );
    await this.prisma.codigoQr.create({
      data: { estudianteId, token, generadoEn: ahora, expiraEn },
    });
    return token;
  }

  /** Devuelve el estudianteId o lanza QR_INVALIDO / QR_CADUCADO. */
  async validar(token: string): Promise<number> {
    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: QR_SECRET });
    } catch (e: any) {
      const caducado = e?.name === 'TokenExpiredError';
      throw new UnauthorizedException({
        codigo: caducado ? 'QR_CADUCADO' : 'QR_INVALIDO',
        message: caducado ? 'El QR ha caducado' : 'El QR no es válido',
      });
    }
    if (payload.tipo !== 'qr') {
      throw new UnauthorizedException({
        codigo: 'QR_INVALIDO',
        message: 'El QR no es válido',
      });
    }
    const fila = await this.prisma.codigoQr.findUnique({ where: { token } });
    if (!fila || fila.estudianteId !== Number(payload.sub)) {
      throw new UnauthorizedException({
        codigo: 'QR_INVALIDO',
        message: 'El QR no es válido',
      });
    }
    return fila.estudianteId;
  }
}