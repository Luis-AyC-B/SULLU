import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

const pad = (n: number) => String(n).padStart(2, '0');
// Las columnas TIME se guardaron como 1970-01-01 en UTC
const hhmm = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const sigla = (nombre: string) =>
  nombre.match(/\(([^)]+)\)\s*$/)?.[1] ?? nombre;
const sinParentesis = (nombre: string) =>
  nombre.replace(/\s*\([^)]*\)\s*$/, '').trim();

@Injectable()
export class EstudianteMeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrTokenService,
  ) {}

  async examenes(estudianteId: number) {
    const filas = await this.prisma.examen_Estudiante.findMany({
      where: { estudianteId },
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
                carrera_materia: { include: { carrera: true, materia: true } },
              },
            },
          },
        },
      },
    });

    const items = filas.map((f) => {
      const ex = f.examen;
      const reserva = ex.reservaAmbiente;
      const cm = ex.carrerasMaterias[0]?.carrera_materia;
      const materia = cm?.materia.nombre ?? 'Examen';
      return {
        orden: `${reserva.fecha.toISOString().slice(0, 10)} ${hhmm(reserva.horarioFijo.horaIni)}`,
        dto: {
          id: ex.id,
          carrera: cm?.carrera.nombre ?? '',
          nombre: `${materia} – ${ex.tipoExamen}`,
          ambiente: sinParentesis(reserva.ambiente.nombre),
          facultad: sigla(reserva.ambiente.facultad?.nombre ?? ''),
          fecha: reserva.fecha.toISOString().slice(0, 10),
          horaInicio: hhmm(reserva.horarioFijo.horaIni),
          horaFin: hhmm(reserva.horarioFijo.horaFin),
          estado: f.estado_habilitado ? 'Habilitado' : 'Inhabilitado',
        },
      };
    });

    return items.sort((a, b) => a.orden.localeCompare(b.orden)).map((i) => i.dto);
  }

  async qrPersonal(estudianteId: number) {
    const est = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });
    if (!est) throw new NotFoundException('Estudiante no encontrado');
    const token = await this.qr.generar(est.id);
    return {
      nombre: `${est.nombre} ${est.apellido ?? ''}`.trim(),
      sis: est.cod_sis,
      ci: est.ci ?? '',
      token,
    };
  }
}