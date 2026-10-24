import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RevisionFotoDto } from './dto/revision-foto.dto';

interface RequestConUsuario {
  user: {
    id: number;
    email: string;
    nombre: string;
  };
  ip?: string;
}

@ApiTags('estudiantes-revision-fotos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('estudiantes')
export class EstudianteAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('fotos-pendientes')
  @Permissions('estudiantes.ver')
  @ApiOperation({ summary: 'Listar solicitudes de cambio de foto pendientes de revisión manual' })
  @ApiResponse({ status: 200, description: 'Lista de fotos pendientes' })
  async listarFotosPendientes() {
    const fotos = await this.prisma.fotoEstudiante.findMany({
      where: { estado: 'PENDIENTE' },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            cod_sis: true,
            ci: true,
            fotoUrl: true,
          },
        },
      },
      orderBy: { creadaEn: 'asc' },
    });

    return fotos.map((f) => ({
      id: f.id,
      estudianteId: f.estudianteId,
      nombre: f.estudiante.nombre,
      apellido: f.estudiante.apellido ?? '',
      cod_sis: f.estudiante.cod_sis,
      ci: f.estudiante.ci ?? '',
      fotoPendienteUrl: f.archivo,
      fotoActivaUrl: f.estudiante.fotoUrl,
      similitud: f.similitud,
      creadaEn: f.creadaEn,
    }));
  }

  @Patch('fotos/:fotoId/revision')
  @Permissions('estudiantes.habilitar')
  @ApiOperation({ summary: 'Aprobar o rechazar manualmente una foto de perfil pendiente' })
  @ApiResponse({ status: 200, description: 'Revisión aplicada con éxito' })
  @ApiResponse({ status: 404, description: 'Foto no encontrada o no pendiente' })
  async revisarFoto(
    @Param('fotoId', ParseIntPipe) fotoId: number,
    @Body() dto: RevisionFotoDto,
    @Req() req: RequestConUsuario,
  ) {
    const foto = await this.prisma.fotoEstudiante.findUnique({
      where: { id: fotoId },
      include: { estudiante: true },
    });

    if (!foto) {
      throw new NotFoundException('Fotografía no encontrada');
    }

    if (foto.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `La fotografía ya se encuentra en estado ${foto.estado} y no puede ser modificada.`,
      );
    }

    const revisorId = req.user?.id;
    const ip = req.ip;

    if (dto.decision === 'APROBAR') {
      // 1. Marcar foto previa ACTIVA como REEMPLAZADA
      await this.prisma.fotoEstudiante.updateMany({
        where: {
          estudianteId: foto.estudianteId,
          estado: 'ACTIVA',
        },
        data: { estado: 'REEMPLAZADA' },
      });

      // 2. Marcar foto pendiente como ACTIVA
      const fotoAprobada = await this.prisma.fotoEstudiante.update({
        where: { id: foto.id },
        data: { estado: 'ACTIVA' },
      });

      // 3. Actualizar fotoUrl del Estudiante
      await this.prisma.estudiante.update({
        where: { id: foto.estudianteId },
        data: {
          fotoUrl: fotoAprobada.archivo,
          perfilCompleto: Boolean(foto.estudiante.telefono),
        },
      });

      // 4. Auditar aprobación manual
      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId: revisorId,
          accion: 'APROBACION_FOTO_MANUAL',
          modulo: 'Portal Estudiante',
          detallesNuevo: {
            fotoId: foto.id,
            estudianteId: foto.estudianteId,
            decision: 'APROBAR',
            motivo: dto.motivo ?? 'Aprobado por el personal autorizado',
          },
          ipOrigen: ip?.slice(0, 45),
        },
      });

      return {
        mensaje: 'Fotografía aprobada exitosamente y establecida como activa.',
        estado: 'ACTIVA',
      };
    } else {
      // RECHAZAR
      await this.prisma.fotoEstudiante.update({
        where: { id: foto.id },
        data: { estado: 'RECHAZADA' },
      });

      // Auditar rechazo manual
      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId: revisorId,
          accion: 'RECHAZO_FOTO_MANUAL',
          modulo: 'Portal Estudiante',
          detallesNuevo: {
            fotoId: foto.id,
            estudianteId: foto.estudianteId,
            decision: 'RECHAZAR',
            motivo: dto.motivo ?? 'Rechazado por el personal autorizado',
          },
          ipOrigen: ip?.slice(0, 45),
        },
      });

      return {
        mensaje: 'Fotografía rechazada exitosamente. La foto previa se mantiene vigente.',
        estado: 'RECHAZADA',
      };
    }
  }
}

