import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from '../portal-estudiante/qr-token.service';

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

export interface ResultadoValidacionPublica {
  estado: 'VALIDO' | 'EXPIRADO' | 'REVOCADO' | 'INVALIDO';
  mensaje: string;
  nombre?: string;
  sis?: string;
  fotoUrl?: string | null;
  examenes?: {
    id: number;
    nombre: string;
    ambiente: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
  }[];
}

@Injectable()
export class CodigosQrService {
  // Rate limiting en memoria: máximo 30 solicitudes por minuto por IP
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
      return true;
    }
    if (entry.count >= 30) {
      return false;
    }
    entry.count++;
    return true;
  }

  /**
   * Endpoint de consulta pública para credencial digital (móviles / escaneo estándar).
   * - No devuelve el CI.
   * - No consume el QR.
   * - Si el QR no es válido, devuelve estado genérico sin filtrar datos personales.
   */
  async validarQrPublico(tokenRaw: string, ip: string): Promise<ResultadoValidacionPublica> {
    if (!this.checkRateLimit(ip)) {
      throw new HttpException(
        'Límite de solicitudes de verificación excedido (máximo 30 por minuto). Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!tokenRaw || !tokenRaw.trim()) {
      return {
        estado: 'INVALIDO',
        mensaje: 'Token QR no proporcionado',
      };
    }

    let token = tokenRaw.trim();
    if (token.includes('token=')) {
      const match = token.match(/[?&]token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    let estudianteId: number;
    try {
      estudianteId = await this.qrTokenService.validar(token);
    } catch (err: unknown) {
      const errorData = (err as { response?: { codigo?: string; message?: string } })?.response;
      if (errorData?.codigo === 'QR_CADUCADO') {
        return {
          estado: 'EXPIRADO',
          mensaje: 'El código QR ha expirado (vigencia máxima 5 minutos)',
        };
      }
      if (errorData?.message?.toLowerCase().includes('revocado')) {
        return {
          estado: 'REVOCADO',
          mensaje: 'El código QR ha sido revocado o ya fue utilizado para ingresar al examen',
        };
      }
      return {
        estado: 'INVALIDO',
        mensaje: 'El código QR no es válido o está dañado',
      };
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: {
        fotos: {
          where: { estado: 'ACTIVA' },
          take: 1,
        },
        examenes: {
          include: {
            examen: {
              include: {
                reservaAmbiente: {
                  include: {
                    horarioFijo: true,
                    ambiente: { include: { facultad: true } },
                  },
                },
                carrerasMaterias: {
                  include: {
                    carrera_materia: {
                      include: { carrera: true, materia: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!estudiante) {
      return {
        estado: 'INVALIDO',
        mensaje: 'Estudiante no registrado en el sistema',
      };
    }

    const tieneFotoActiva = estudiante.fotos.length > 0 || !!estudiante.fotoUrl;
    const fotoUrl = tieneFotoActiva
      ? `/qr/foto?token=${encodeURIComponent(token)}`
      : null;

    const examenes = estudiante.examenes.map((ee) => {
      const ex = ee.examen;
      const res = ex.reservaAmbiente;
      const cm = ex.carrerasMaterias[0]?.carrera_materia;
      const materia = cm?.materia.nombre ?? 'Examen';

      return {
        id: ex.id,
        nombre: `${materia} – ${ex.tipoExamen}`,
        ambiente: res.ambiente.nombre,
        fecha: res.fecha.toISOString().slice(0, 10),
        horaInicio: hhmm(res.horarioFijo.horaIni),
        horaFin: hhmm(res.horarioFijo.horaFin),
        estado: ee.estado_habilitado ? 'Habilitado' : 'Inhabilitado',
      };
    });

    return {
      estado: 'VALIDO',
      mensaje: 'Código QR válido y vigente',
      nombre: `${estudiante.nombre} ${estudiante.apellido ?? ''}`.trim(),
      sis: estudiante.cod_sis,
      fotoUrl,
      examenes,
    };
  }

  /**
   * Sirve la fotografía activa del estudiante verificando que el token QR sea válido y vigente.
   * Evita la exposición pública permanente de rutas de archivos.
   */
  async servirFotoQr(tokenRaw: string, res: Response): Promise<void> {
    if (!tokenRaw || !tokenRaw.trim()) {
      throw new BadRequestException('Token QR requerido para visualizar la fotografía');
    }

    let token = tokenRaw.trim();
    if (token.includes('token=')) {
      const match = token.match(/[?&]token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    let estudianteId: number;
    try {
      estudianteId = await this.qrTokenService.validar(token);
    } catch {
      throw new UnauthorizedException('Token QR inválido o expirado');
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: {
        fotos: {
          where: { estado: 'ACTIVA' },
          take: 1,
        },
      },
    });

    const archivoRelativo = estudiante?.fotos[0]?.archivo || estudiante?.fotoUrl;
    if (!archivoRelativo) {
      throw new NotFoundException('El estudiante no posee una fotografía activa');
    }

    const rutaLimpia = archivoRelativo.replace(/^\/?(uploads\/)?/, '');
    const rutaCompleta = path.resolve(process.cwd(), 'uploads', rutaLimpia);

    if (!fs.existsSync(rutaCompleta)) {
      throw new NotFoundException('Archivo de fotografía no encontrado en el servidor');
    }

    const ext = path.extname(rutaCompleta).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    const stream = fs.createReadStream(rutaCompleta);
    stream.pipe(res);
  }

  /**
   * Método de compatibilidad para endpoints de control
   */
  async validarQr(tokenRaw: string) {
    const res = await this.validarQrPublico(tokenRaw, '127.0.0.1');
    if (res.estado !== 'VALIDO') {
      throw new BadRequestException(res.mensaje);
    }
    return res;
  }
}
