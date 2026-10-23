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
import sizeOf from 'image-size';
import { PrismaService } from '../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordEstudianteDto } from './dto/cambiar-password-estudiante.dto';
import {
  VALIDADOR_FOTO_TOKEN,
  type ValidadorFoto,
} from './validador-foto/validador-foto.interface';

const pad = (n: number) => String(n).padStart(2, '0');
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
    @Inject(VALIDADOR_FOTO_TOKEN)
    private readonly validadorFoto: ValidadorFoto,
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
          nombre: `${materia} – ${ex.tipoExamen}`, // <- esta línea
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

  async perfil(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { estudiante: true },
    });

    if (!usuario || !usuario.estudiante) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }

    const est = usuario.estudiante;
    const perfilCompleto = Boolean(
      est.fotoUrl && est.telefono && est.ci && !usuario.debeConfigurarPerfil,
    );

    return {
      id: est.id,
      sis: est.cod_sis,
      cod_sis: est.cod_sis,
      nombre: `${est.nombre} ${est.apellido ?? ''}`.trim(),
      apellido: est.apellido ?? '',
      correo: usuario.correo,
      ci: est.ci ?? null,
      telefono: est.telefono ?? null,
      fotoUrl: est.fotoUrl ?? null,
      perfilCompleto,
      debeConfigurarPerfil: usuario.debeConfigurarPerfil,
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }

  async actualizarPerfil(usuarioId: number, dto: ActualizarPerfilDto) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { usuarioId },
      include: { usuario: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (dto.ci !== undefined) {
      const ciLimpio = dto.ci.trim();
      if (!ciLimpio && estudiante.ci) {
        throw new BadRequestException(
          'El carnet de identidad no puede quedar vacío.',
        );
      }
    }

    const nuevoCi =
      dto.ci !== undefined && dto.ci.trim().length > 0
        ? dto.ci.trim()
        : estudiante.ci;

    const nuevoTelefono =
      dto.telefono !== undefined && dto.telefono.trim().length > 0
        ? dto.telefono.trim()
        : estudiante.telefono;

    const actualizado = await this.prisma.$transaction(async (tx) => {
      if (nuevoTelefono) {
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { telefono: nuevoTelefono },
        });
      }

      return tx.estudiante.update({
        where: { id: estudiante.id },
        data: {
          ci: nuevoCi,
          telefono: nuevoTelefono,
        },
        include: { usuario: true },
      });
    });

    const perfilCompleto = Boolean(
      actualizado.fotoUrl &&
      actualizado.telefono &&
      actualizado.ci &&
      !actualizado.usuario?.debeConfigurarPerfil,
    );

    return {
      id: actualizado.id,
      sis: actualizado.cod_sis,
      cod_sis: actualizado.cod_sis,
      nombre: `${actualizado.nombre} ${actualizado.apellido ?? ''}`.trim(),
      apellido: actualizado.apellido ?? '',
      correo: actualizado.usuario?.correo ?? '',
      ci: actualizado.ci ?? null,
      telefono: actualizado.telefono ?? null,
      fotoUrl: actualizado.fotoUrl ?? null,
      perfilCompleto,
      debeConfigurarPerfil: actualizado.usuario?.debeConfigurarPerfil ?? false,
      debeCambiarPassword: actualizado.usuario?.debeCambiarPassword ?? false,
    };
  }

  async cambiarPassword(usuarioId: number, dto: CambiarPasswordEstudianteDto) {
    const confirmacion = dto.confirmar || dto.confirmarPassword;
    if (confirmacion && dto.passwordNueva !== confirmacion) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    if (dto.passwordNueva === dto.passwordActual) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { estudiante: true },
    });

    if (!usuario || !usuario.estudiante) {
      throw new NotFoundException('Usuario o estudiante no encontrado');
    }

    if (
      usuario.estudiante.ci &&
      dto.passwordNueva.trim() === usuario.estudiante.ci.trim()
    ) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a tu carnet de identidad',
      );
    }

    const esValida = await bcrypt.compare(dto.passwordActual, usuario.password);
    if (!esValida) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    const nuevoSessionId = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          password: passwordHash,
          sessionId: nuevoSessionId,
          debeConfigurarPerfil: false,
          debeCambiarPassword: false,
        },
      });

      await tx.estudiante.update({
        where: { id: usuario.estudiante!.id },
        data: {
          perfilCompleto: true,
          qrVersion: { increment: 1 },
        },
      });

      await tx.bitacora_Auditoria.create({
        data: {
          usuarioId,
          accion: 'CAMBIO_PASSWORD_ESTUDIANTE',
          modulo: 'Portal Estudiante',
          detallesNuevo: {
            motivo: 'Configuración o cambio de contraseña del perfil',
          },
        },
      });
    });

    return {
      message: 'Contraseña actualizada correctamente',
      debeConfigurarPerfil: false,
      perfilCompleto: true,
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

    const borrarTemporal = (ruta: string) => {
      try {
        if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
      } catch {
        // Ignorar fallo al limpiar archivo temporal
      }
    };

    if (!estudiante) {
      borrarTemporal(file.path);
      throw new NotFoundException('Estudiante no encontrado');
    }

    // 1. Leer buffer y validar tamaño
    const fileBuffer = fs.readFileSync(file.path);

    if (fileBuffer.length > 2 * 1024 * 1024) {
      borrarTemporal(file.path);
      throw new BadRequestException('La fotografía no debe superar los 2 MB');
    }

    // 2. Validación de Magic Bytes (JPG / PNG)
    const esJpg =
      fileBuffer[0] === 0xff &&
      fileBuffer[1] === 0xd8 &&
      fileBuffer[2] === 0xff;
    const esPng =
      fileBuffer[0] === 0x89 &&
      fileBuffer[1] === 0x50 &&
      fileBuffer[2] === 0x4e &&
      fileBuffer[3] === 0x47;

    if (!esJpg && !esPng) {
      borrarTemporal(file.path);
      throw new BadRequestException(
        'El archivo no corresponde a una imagen válida JPG o PNG (magic bytes inválidos)',
      );
    }

    // 3. Validación de Dimensiones (mínimo 600x600 px y cuadrada)
    let dimensiones: { width?: number; height?: number };
    try {
      dimensiones = sizeOf(fileBuffer);
    } catch {
      borrarTemporal(file.path);
      throw new BadRequestException(
        'No se pudieron leer las dimensiones de la imagen',
      );
    }

    const { width, height } = dimensiones;
    if (!width || !height || width < 600 || height < 600) {
      borrarTemporal(file.path);
      throw new BadRequestException(
        `La imagen debe tener un tamaño mínimo de 600x600 píxeles. Dimensiones actuales: ${width ?? 0}x${height ?? 0} px.`,
      );
    }

    const ratio = width / height;
    if (ratio < 0.85 || ratio > 1.15) {
      borrarTemporal(file.path);
      throw new BadRequestException(
        'La fotografía debe ser de formato cuadrado (relación de aspecto 1:1)',
      );
    }

    // 4. Renombrar con UUID para seguridad
    const extension = esPng ? '.png' : '.jpg';
    const uuidNombre = `${crypto.randomUUID()}${extension}`;
    const directorioDestino = path.resolve(
      process.cwd(),
      'uploads/estudiantes',
    );

    if (!fs.existsSync(directorioDestino)) {
      fs.mkdirSync(directorioDestino, { recursive: true });
    }

    const rutaFinalFisica = path.join(directorioDestino, uuidNombre);
    fs.copyFileSync(file.path, rutaFinalFisica);

    borrarTemporal(file.path);

    const rutaRelativa = `/uploads/estudiantes/${uuidNombre}`;
    const hashSha256 = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // 5. Hook de validación facial (ValidadorFoto)
    const validacion = await this.validadorFoto.validar(fileBuffer);

    // 6. Transacción atómica: reemplazar anteriores e insertar ACTIVA
    await this.prisma.$transaction(async (tx) => {
      await tx.fotoEstudiante.updateMany({
        where: {
          estudianteId: estudiante.id,
          estado: 'ACTIVA',
        },
        data: { estado: 'REEMPLAZADA' },
      });

      const nuevaFoto = await tx.fotoEstudiante.create({
        data: {
          estudianteId: estudiante.id,
          archivo: rutaRelativa,
          hashSha256,
          estado: 'ACTIVA',
          similitud: validacion.similitud ?? 1.0,
        },
      });

      await tx.estudiante.update({
        where: { id: estudiante.id },
        data: {
          fotoUrl: rutaRelativa,
          qrVersion: { increment: 1 },
        },
      });

      await tx.bitacora_Auditoria.create({
        data: {
          usuarioId,
          accion: 'FOTO_ESTUDIANTE_ACTUALIZADA',
          modulo: 'Portal Estudiante',
          detallesNuevo: {
            fotoId: nuevaFoto.id,
            archivo: nuevaFoto.archivo,
            hashSha256,
            estado: 'ACTIVA',
          },
          ipOrigen: ip?.slice(0, 45),
        },
      });
    });

    return {
      message: 'Fotografía subida y validada exitosamente.',
      fotoUrl: rutaRelativa,
      estado: 'ACTIVA' as const,
      similitud: validacion.similitud ?? 1.0,
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

    return fotos.map((f) => ({
      id: f.id,
      archivo: f.archivo,
      estado: f.estado,
      similitud: f.similitud,
      creadaEn: f.creadaEn
        ? f.creadaEn.toISOString()
        : new Date().toISOString(),
    }));
  }
}
