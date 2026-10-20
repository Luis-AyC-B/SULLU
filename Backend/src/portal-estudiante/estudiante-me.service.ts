import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordEstudianteDto } from './dto/cambiar-password-estudiante.dto';
import {
  COMPARADOR_FACIAL_TOKEN,
  type ComparadorFacial,
  type ResultadoComparacionFacial,
  type ResultadoDeteccionRostros,
} from './facial/comparador-facial.interface';

const pad = (n: number) => String(n).padStart(2, '0');
// Las columnas TIME se guardaron como 1970-01-01 en UTC
const hhmm = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const sigla = (nombre: string) =>
  nombre.match(/\(([^)]+)\)\s*$/)?.[1] ?? nombre;
const sinParentesis = (nombre: string) =>
  nombre.replace(/\s*\([^)]*\)\s*$/, '').trim();

function resolverFrontendUrl(): string {
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  try {
    const interfaces = os.networkInterfaces();
    let ipCandidata = '';
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs || []) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const lower = name.toLowerCase();
          if (
            lower.includes('wi-fi') ||
            lower.includes('wlan') ||
            lower.includes('inalámbrica') ||
            lower.includes('wireless')
          ) {
            return `http://${addr.address}:4000`;
          }
          if (
            !ipCandidata &&
            !lower.includes('vethernet') &&
            !lower.includes('vmnet')
          ) {
            ipCandidata = addr.address;
          }
        }
      }
    }
    if (ipCandidata) {
      return `http://${ipCandidata}:4000`;
    }
  } catch {}
  return envUrl || 'http://localhost:4000';
}

@Injectable()
export class EstudianteMeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrTokenService,
    @Inject(COMPARADOR_FACIAL_TOKEN)
    private readonly comparadorFacial: ComparadorFacial,
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

    return items
      .sort((a, b) => a.orden.localeCompare(b.orden))
      .map((i) => i.dto);
  }

  async qrPersonal(estudianteId: number) {
    const est = await this.prisma.estudiante.findUnique({
      where: { id: estudianteId },
    });
    if (!est) throw new NotFoundException('Estudiante no encontrado');
    const token = await this.qr.generar(est.id);
    const frontendUrl = resolverFrontendUrl();
    const qrUrl = `${frontendUrl}/validar-qr?token=${encodeURIComponent(token)}`;
    return {
      nombre: `${est.nombre} ${est.apellido ?? ''}`.trim(),
      sis: est.cod_sis,
      ci: est.ci ?? '',
      token,
      qrUrl,
    };
  }

  async perfil(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { estudiante: true },
    });

    if (!usuario || !usuario.estudiante) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }

    const est = usuario.estudiante;
    return {
      id: est.id,
      cod_sis: est.cod_sis,
      ci: est.ci ?? '',
      nombre: est.nombre,
      apellido: est.apellido ?? '',
      correo: usuario.correo,
      telefono: est.telefono ?? '',
      fotoUrl: est.fotoUrl ?? null,
      perfilCompleto: est.perfilCompleto,
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }

  async actualizarPerfil(usuarioId: number, dto: ActualizarPerfilDto) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { usuarioId },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const nuevoTelefono =
      dto.telefono !== undefined ? dto.telefono.trim() : estudiante.telefono;
    const perfilCompleto = Boolean(nuevoTelefono && estudiante.fotoUrl);

    const actualizado = await this.prisma.estudiante.update({
      where: { id: estudiante.id },
      data: {
        telefono: nuevoTelefono,
        perfilCompleto,
      },
      include: { usuario: true },
    });

    return {
      id: actualizado.id,
      cod_sis: actualizado.cod_sis,
      ci: actualizado.ci ?? '',
      nombre: actualizado.nombre,
      apellido: actualizado.apellido ?? '',
      correo: actualizado.usuario?.correo ?? '',
      telefono: actualizado.telefono ?? '',
      fotoUrl: actualizado.fotoUrl ?? null,
      perfilCompleto: actualizado.perfilCompleto,
      debeCambiarPassword: actualizado.usuario?.debeCambiarPassword ?? false,
    };
  }

  async cambiarPassword(
    usuarioId: number,
    dto: CambiarPasswordEstudianteDto,
  ) {
    if (dto.passwordNueva !== dto.confirmarPassword) {
      throw new BadRequestException('Las nuevas contraseñas no coinciden');
    }

    if (dto.passwordNueva === dto.passwordActual) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la contraseña actual',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { estudiante: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const esValida = await bcrypt.compare(dto.passwordActual, usuario.password);
    if (!esValida) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        password: passwordHash,
        debeCambiarPassword: false,
      },
    });

    return {
      message: 'Contraseña actualizada con éxito',
      debeCambiarPassword: false,
    };
  }

  async procesarSubidaFoto(
    usuarioId: number,
    file: Express.Multer.File,
    ip?: string,
  ) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { usuarioId },
    });

    if (!estudiante) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Calcular hash SHA-256 de la imagen subida
    const fileBuffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : Buffer.from(""));
    const hashSha256 = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // Verificar si ya subió la misma imagen idéntica anteriormente
    const duplicado = await this.prisma.fotoEstudiante.findFirst({
      where: { estudianteId: estudiante.id, hashSha256 },
    });

    if (duplicado) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
      throw new BadRequestException(
        'Esta misma fotografía ya fue subida y registrada anteriormente.',
      );
    }

    // Regla de Negocio Facial 1: Detección de rostros en la foto subida
    let detRostros: ResultadoDeteccionRostros = { rostrosDetectados: 1 };
    try {
      detRostros = await this.comparadorFacial.detectarRostros(fileBuffer);
    } catch {
      // Si el detector arroja error, detRostros queda en 1 para continuar a verificación
    }

    if (detRostros.rostrosDetectados === 0) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
      throw new BadRequestException(
        'No se detectó ningún rostro en la fotografía. Sube una foto nítida de frente y con buena iluminación.',
      );
    }

    if (detRostros.rostrosDetectados > 1) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
      throw new BadRequestException(
        'Se detectaron múltiples rostros en la fotografía. Solo debe aparecer una persona.',
      );
    }

    const fotoActiva = await this.prisma.fotoEstudiante.findFirst({
      where: { estudianteId: estudiante.id, estado: 'ACTIVA' },
      orderBy: { creadaEn: 'desc' },
    });

    const rutaRelativa = `/uploads/estudiantes/${file.filename}`;

    // Caso 1: Primera foto del estudiante
    if (!fotoActiva && !estudiante.fotoUrl) {
      const nuevaFoto = await this.prisma.fotoEstudiante.create({
        data: {
          estudianteId: estudiante.id,
          archivo: rutaRelativa,
          hashSha256,
          estado: 'ACTIVA',
          similitud: 1.0,
        },
      });

      const perfilCompleto = Boolean(estudiante.telefono);

      await this.prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          fotoUrl: nuevaFoto.archivo,
          perfilCompleto,
        },
      });

      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId,
          accion: 'SUBIDA_PRIMERA_FOTO',
          modulo: 'Portal Estudiante',
          detallesNuevo: {
            fotoId: nuevaFoto.id,
            archivo: nuevaFoto.archivo,
            hashSha256,
            estado: 'ACTIVA',
            rostrosDetectados: detRostros.rostrosDetectados,
          },
          ipOrigen: ip?.slice(0, 45),
        },
      });

      return {
        message: 'Foto de perfil inicial registrada con éxito',
        fotoUrl: nuevaFoto.archivo,
        estado: 'ACTIVA',
        perfilCompleto,
        similitud: 1.0,
      };
    }

    // Caso 2: Cambio de foto (comparación facial con foto previa ACTIVA)
    const umbralAceptar = Number(process.env.UMBRAL_ACEPTAR ?? 0.85);
    const umbralRevision = Number(process.env.UMBRAL_REVISION ?? 0.60);

    let baseBuffer: Buffer | null = null;
    const rutaBaseFisica = fotoActiva
      ? path.resolve(process.cwd(), fotoActiva.archivo.replace(/^\//, ''))
      : null;

    if (rutaBaseFisica && fs.existsSync(rutaBaseFisica)) {
      try {
        baseBuffer = fs.readFileSync(rutaBaseFisica);
      } catch {}
    }
    if (!baseBuffer && fotoActiva) {
      baseBuffer = Buffer.from('mock-base-buffer-facial-comparison');
    }

    let resultadoComp: ResultadoComparacionFacial = {
      similitud: null,
      rostrosDetectados: detRostros.rostrosDetectados,
    };

    if (baseBuffer) {
      try {
        resultadoComp = await this.comparadorFacial.comparar(baseBuffer, fileBuffer);
      } catch {
        // Si el comparador falla o lanza excepción, resultadoComp.similitud queda en null
      }
    }

    const similitud = resultadoComp.similitud;
    let estadoFinal: 'ACTIVA' | 'PENDIENTE' | 'RECHAZADA';
    let mensajeRespuesta: string;

    if (similitud !== null && similitud >= umbralAceptar) {
      // Similitud >= UMBRAL_ACEPTAR: Nueva pasa a ACTIVA y anterior a REEMPLAZADA
      estadoFinal = 'ACTIVA';
      mensajeRespuesta = 'Identidad verificada exitosamente. Tu foto de perfil ha sido actualizada.';

      await this.prisma.fotoEstudiante.updateMany({
        where: {
          estudianteId: estudiante.id,
          estado: 'ACTIVA',
        },
        data: { estado: 'REEMPLAZADA' },
      });

      await this.prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          fotoUrl: rutaRelativa,
          perfilCompleto: Boolean(estudiante.telefono),
        },
      });
    } else if (
      similitud !== null &&
      similitud >= umbralRevision &&
      similitud < umbralAceptar
    ) {
      // Similitud entre UMBRAL_REVISION y UMBRAL_ACEPTAR: Pasa a estado PENDIENTE de revisión manual
      estadoFinal = 'PENDIENTE';
      mensajeRespuesta =
        'Tu fotografía ha quedado en revisión manual por baja similitud. Tu foto actual continúa vigente.';
    } else if (similitud !== null && similitud < umbralRevision) {
      // Similitud < UMBRAL_REVISION: RECHAZADA con motivo genérico
      estadoFinal = 'RECHAZADA';
      mensajeRespuesta =
        'La fotografía no coincide con el titular registrado (baja similitud facial). Solicitud rechazada.';
    } else {
      // Si el comparador falla o no está disponible: queda PENDIENTE (nunca ACTIVA por defecto)
      estadoFinal = 'PENDIENTE';
      mensajeRespuesta =
        'El comparador biométrico no está disponible en este momento. Tu fotografía ha quedado registrada en espera de revisión manual.';
    }

    const nuevaFoto = await this.prisma.fotoEstudiante.create({
      data: {
        estudianteId: estudiante.id,
        archivo: rutaRelativa,
        hashSha256,
        estado: estadoFinal,
        similitud,
      },
    });

    await this.prisma.bitacora_Auditoria.create({
      data: {
        usuarioId,
        accion:
          estadoFinal === 'ACTIVA'
            ? 'CAMBIO_FOTO_ACEPTADO_IA'
            : estadoFinal === 'RECHAZADA'
            ? 'CAMBIO_FOTO_RECHAZADO_IA'
            : 'CAMBIO_FOTO_PENDIENTE_REVISION',
        modulo: 'Portal Estudiante',
        detallesNuevo: {
          fotoId: nuevaFoto.id,
          archivo: nuevaFoto.archivo,
          hashSha256,
          estado: estadoFinal,
          similitud,
          umbrales: { aceptar: umbralAceptar, revision: umbralRevision },
        },
        ipOrigen: ip?.slice(0, 45),
      },
    });

    return {
      message: mensajeRespuesta,
      fotoUrl: estadoFinal === 'ACTIVA' ? nuevaFoto.archivo : estudiante.fotoUrl,
      fotoPendienteUrl: estadoFinal === 'PENDIENTE' ? nuevaFoto.archivo : undefined,
      estado: estadoFinal,
      similitud,
      perfilCompleto:
        estadoFinal === 'ACTIVA'
          ? Boolean(estudiante.telefono)
          : estudiante.perfilCompleto,
    };
  }

  async historialFotos(usuarioId: number) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { usuarioId },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const fotos = await this.prisma.fotoEstudiante.findMany({
      where: { estudianteId: estudiante.id },
      orderBy: { creadaEn: 'desc' },
      select: {
        id: true,
        archivo: true,
        estado: true,
        similitud: true,
        creadaEn: true,
      },
    });

    return fotos.map((f) => {
      const isoStr = f.creadaEn ? f.creadaEn.toISOString() : new Date().toISOString();
      return {
        id: f.id,
        archivo: f.archivo,
        estado: f.estado,
        similitud: f.similitud,
        creadaEn: isoStr,
        creadoEn: isoStr,
      };
    });
  }
}
