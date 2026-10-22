import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
  ) {}

  async generar(estudianteId: number, examenId: number) {
    const rel = await this.prisma.examen_Estudiante.findFirst({
      where: { estudianteId, examenId },
      include: {
        examen: {
          include: { reservaAmbiente: { include: { horarioFijo: true } } },
        },
      },
    });

    if (!rel || !rel.estado_habilitado || rel.examen.estado === 'CANCELADO') {
      throw err(HttpStatus.FORBIDDEN, 'EXAMEN_NO_HABILITADO', 'No estás habilitado en este examen');
    }

    const { fecha, horarioFijo } = rel.examen.reservaAmbiente;
    const inicio = combinar(fecha, horarioFijo.horaIni);
    const fin = combinar(fecha, horarioFijo.horaFin);
    const ahora = new Date(); // hora del SERVIDOR

    if (ahora >= fin) {
      throw err(HttpStatus.GONE, 'QR_EXAMEN_FINALIZADO', 'El examen ya finalizó');
    }
    if (ahora.getTime() < inicio.getTime() - VENTANA_MS) {
      throw err(
        HttpStatus.CONFLICT,
        'QR_AUN_NO_DISPONIBLE',
        'El QR se habilita 24 horas antes del examen',
      );
    }

    const token = await this.qrToken.generarOReutilizarParaExamen(estudianteId, examenId, fin);
    const base = (process.env.PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:4000').replace(/\/$/, '');

    return { qrUrl: `${base}/qr/v/${token}`, vigenteHasta: fin.toISOString() };
  }
}