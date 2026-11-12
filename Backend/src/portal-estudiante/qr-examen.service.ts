import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import {
  COMPARADOR_FACIAL_TOKEN,
  type ComparadorFacial,
} from './facial/comparador-facial.interface';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

const VENTANA_MS = 24 * 60 * 60 * 1000;
const LA_PAZ_OFFSET_H = 4; // America/La_Paz = UTC-4, sin horario de verano

// fecha (@db.Date) + hora (@db.Time) guardadas como hora local de La Paz -> instante UTC real
function combinar(fecha: Date, hora: Date): Date {
  return new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      hora.getUTCHours() + LA_PAZ_OFFSET_H,
      hora.getUTCMinutes(),
      hora.getUTCSeconds(),
    ),
  );
}

function err(status: number, code: string, message: string) {
  return new HttpException({ code, codigo: code, message }, status);
}

@Injectable()
export class QrExamenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrToken: QrTokenService,
    @Inject(COMPARADOR_FACIAL_TOKEN) private readonly facial: ComparadorFacial,
  ) {}

  async generar(
    estudianteId: number,
    examenId: number,
    selfie?: Express.Multer.File,
  ) {
    const rel = await this.prisma.examen_Estudiante.findFirst({
      where: { estudianteId, examenId },
      include: {
        examen: {
          include: { reservaAmbiente: { include: { horarioFijo: true } } },
        },
      },
    });

    if (!rel || !rel.estado_habilitado || rel.examen.estado === 'CANCELADO') {
      throw err(
        HttpStatus.FORBIDDEN,
        'EXAMEN_NO_HABILITADO',
        'No estás habilitado en este examen',
      );
    }

    const { fecha, horarioFijo } = rel.examen.reservaAmbiente;
    const inicio = combinar(fecha, horarioFijo.horaIni);
    const fin = combinar(fecha, horarioFijo.horaFin);
    const ahora = new Date(); // hora del SERVIDOR

    if (ahora >= fin) {
      throw err(
        HttpStatus.GONE,
        'QR_EXAMEN_FINALIZADO',
        'El examen ya finalizó',
      );
    }
    if (ahora.getTime() < inicio.getTime() - VENTANA_MS) {
      throw err(
        HttpStatus.CONFLICT,
        'QR_AUN_NO_DISPONIBLE',
        'El QR se habilita 24 horas antes del examen',
      );
    }

    if (
      !selfie?.buffer?.length ||
      !['image/jpeg', 'image/png'].includes(selfie.mimetype)
    ) {
      throw err(400, 'SELFIE_INVALIDA', 'Debes enviar una selfie JPG o PNG');
    }
    const foto = await this.prisma.fotoEstudiante.findFirst({
      where: { estudianteId, estado: 'ACTIVA' },
      orderBy: { creadaEn: 'desc' },
    });
    if (!foto)
      throw err(
        409,
        'FOTO_NO_DISPONIBLE',
        'No tienes una fotografía original activa',
      );
    const directorio = resolve('uploads/estudiantes');
    const archivo = resolve('.', foto.archivo.replace(/^\/+/, ''));
    if (!archivo.startsWith(directorio + sep))
      throw err(503, 'FOTO_NO_DISPONIBLE', 'Fotografía original no disponible');
    const threshold = Number(process.env.HU23_FACE_THRESHOLD || 0.45);
    if (!Number.isFinite(threshold) || threshold < 0.3 || threshold > 1)
      throw err(503, 'ERROR_SERVIDOR', 'Configuración facial inválida');
    let resultado;
    try {
      const original = await readFile(archivo);
      resultado = await this.facial.comparar(original, selfie.buffer);
    } catch {
      throw err(
        503,
        'ERROR_SERVIDOR',
        'No se pudo realizar la verificación facial',
      );
    }
    if (resultado.error)
      throw err(
        503,
        'ERROR_SERVIDOR',
        'El motor facial no pudo procesar las imágenes',
      );
    if (
      resultado.rostrosDetectados !== 1 ||
      resultado.rostrosDetectadosBase !== 1 ||
      resultado.similitud === null ||
      !Number.isFinite(resultado.similitud) ||
      resultado.similitud < threshold
    ) {
      throw err(
        403,
        'VERIFICACION_FALLIDA',
        'La selfie no coincide con tu fotografía original',
      );
    }
    const token = await this.qrToken.generarParaExamen(
      estudianteId,
      examenId,
      fin,
    );
    const base = (
      process.env.PUBLIC_APP_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:4000'
    ).replace(/\/$/, '');

    return {
      qrUrl: `${base}/qr/v/${token}`,
      token,
      vigenteHasta: fin.toISOString(),
    };
  }
}
