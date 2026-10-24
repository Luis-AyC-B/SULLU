import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const QR_SECRET = process.env.QR_SECRET ?? 'dev-qr-secret';

export interface QrJwtPayload {
  sub?: number;
  estudianteId?: number;
  examenId?: number;
  qrVersion?: number;
  jti?: string;
  tipo?: 'qr' | 'personal' | 'examen';
  iat?: number;
  exp?: number;
}

type TipoEsperado = 'personal' | 'examen';

function qrError(codigo: string, message: string) {
  return new UnauthorizedException({ codigo, code: codigo, message });
}

@Injectable()
export class QrTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Decodifica SIN verificar firma (solo para inspeccionar metadatos). */
  decodificar(token: string): QrJwtPayload | null {
    try {
      return this.jwt.decode(token);
    } catch {
      return null;
    }
  }

  /** Devuelve el token vigente del examen o genera uno nuevo (mismo exp = fin del examen). */
  async generarOReutilizarParaExamen(
    estudianteId: number,
    examenId: number,
    finExamen: Date,
  ): Promise<string> {
    const vigente = await this.prisma.codigoQr.findFirst({
      where: {
        estudianteId,
        examenId,
        tipo: 'examen',
        expiraEn: { gt: new Date() },
      },
      orderBy: { generadoEn: 'desc' },
    });

    if (vigente) {
      try {
        const p = this.jwt.verify<QrJwtPayload>(vigente.token, {
          secret: QR_SECRET,
        });
        const est = await this.prisma.estudiante.findUnique({
          where: { id: estudianteId },
        });
        if (p.tipo === 'examen' && est && p.qrVersion === est.qrVersion) {
          return vigente.token;
        }
      } catch {
        // token inválido o vencido: se genera otro
      }
    }
    return this.generarParaExamen(estudianteId, examenId, finExamen);
  }

  /** QR de examen: exp = FIN del examen. Nunca incluye el CI. */
  async generarParaExamen(
    estudianteId: number,
    examenId: number,
    finExamen: Date,
  ): Promise<string> {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    const ahoraMs = Date.now();
    const token = this.jwt.sign(
      {
        sub: estudianteId,
        examenId,
        qrVersion: estudiante.qrVersion,
        jti: randomUUID(),
        tipo: 'examen',
        iat: Math.floor(ahoraMs / 1000),
        exp: Math.floor(finExamen.getTime() / 1000),
      },
      { secret: QR_SECRET },
    );

    await this.prisma.codigoQr.create({
      data: {
        estudianteId,
        examenId,
        tipo: 'examen',
        token,
        generadoEn: new Date(ahoraMs),
        expiraEn: finExamen,
      },
    });

    return token;
  }

  /**
   * Devuelve el estudianteId o lanza QR_INVALIDO / QR_CADUCADO / QR_REVOCADO.
   * Con tipoEsperado rechaza tokens de tipo cruzado.
   * Los QR personales ya no se generan; los emitidos antes se siguen aceptando hasta que vencen (24 h).
   */
  async validar(token: string, tipoEsperado?: TipoEsperado): Promise<number> {
    let payload: QrJwtPayload;
    try {
      payload = this.jwt.verify(token, { secret: QR_SECRET });
    } catch (e: unknown) {
      const caducado = (e as { name?: string })?.name === 'TokenExpiredError';
      throw qrError(
        caducado ? 'QR_CADUCADO' : 'QR_INVALIDO',
        caducado ? 'El QR ha caducado' : 'El QR no es válido',
      );
    }

    const subId = Number(payload.sub ?? payload.estudianteId);
    if (!subId) throw qrError('QR_INVALIDO', 'El QR no es válido');

    const esPersonal = payload.tipo === 'qr' || payload.tipo === 'personal';
    const esExamen = payload.tipo === 'examen';
    if (!esPersonal && !esExamen)
      throw qrError('QR_INVALIDO', 'El QR no es válido');
    if (tipoEsperado === 'personal' && !esPersonal) {
      throw qrError('QR_INVALIDO', 'El QR no es válido');
    }
    if (tipoEsperado === 'examen' && !esExamen) {
      throw qrError('QR_INVALIDO', 'El QR no es válido');
    }

    const fila = await this.prisma.codigoQr.findUnique({ where: { token } });
    if (!fila || fila.estudianteId !== subId) {
      throw qrError('QR_INVALIDO', 'El QR no es válido o ha sido revocado');
    }
    if (fila.expiraEn < new Date()) {
      throw qrError('QR_CADUCADO', 'El QR ha caducado');
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: fila.estudianteId },
    });
    if (!estudiante) throw qrError('QR_INVALIDO', 'Estudiante no registrado');

    if (
      payload.qrVersion !== undefined &&
      estudiante.qrVersion !== payload.qrVersion
    ) {
      throw qrError(
        'QR_REVOCADO',
        'El código QR ha sido revocado tras una actualización de perfil o cambio de contraseña.',
      );
    }

    return fila.estudianteId;
  }
}
