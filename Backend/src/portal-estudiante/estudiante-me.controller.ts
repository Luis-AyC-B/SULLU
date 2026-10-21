import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { EstudianteJwtGuard } from './estudiante-jwt.guard';
import { EstudianteMeService } from './estudiante-me.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordEstudianteDto } from './dto/cambiar-password-estudiante.dto';

interface RequestConEstudiante {
  estudiante: {
    usuarioId: number;
    estudianteId: number;
  };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('portal-estudiante')
@ApiBearerAuth()
@Controller('estudiantes/me')
@UseGuards(EstudianteJwtGuard)
export class EstudianteMeController {
  constructor(private readonly me: EstudianteMeService) {}

  @Get('perfil')
  @ApiOperation({
    summary: 'Obtener datos de perfil del estudiante autenticado',
  })
  @ApiResponse({ status: 200, description: 'Datos del perfil del estudiante' })
  perfil(@Req() req: RequestConEstudiante) {
    return this.me.perfil(req.estudiante.usuarioId);
  }

  @Put('perfil')
  @ApiOperation({ summary: 'Actualizar datos de perfil (CI y teléfono)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  actualizarPerfilPut(
    @Req() req: RequestConEstudiante,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.me.actualizarPerfil(req.estudiante.usuarioId, dto);
  }

  @Patch('perfil')
  @ApiOperation({ summary: 'Actualizar datos de contacto (teléfono o CI)' })
  actualizarPerfilPatch(
    @Req() req: RequestConEstudiante,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.me.actualizarPerfil(req.estudiante.usuarioId, dto);
  }

  @Post('cambiar-password')
  @ApiOperation({ summary: 'Cambiar contraseña obligatoria o voluntaria' })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada con éxito' })
  @ApiResponse({ status: 400, description: 'Datos de contraseña inválidos' })
  cambiarPasswordPost(
    @Req() req: RequestConEstudiante,
    @Body() dto: CambiarPasswordEstudianteDto,
  ) {
    return this.me.cambiarPassword(req.estudiante.usuarioId, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Cambiar contraseña (ruta compatible)' })
  cambiarPasswordPatch(
    @Req() req: RequestConEstudiante,
    @Body() dto: CambiarPasswordEstudianteDto,
  ) {
    return this.me.cambiarPassword(req.estudiante.usuarioId, dto);
  }

  @Post('foto')
  @ApiOperation({ summary: 'Subir fotografía cuadrada del estudiante' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Foto procesada (ACTIVA)' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o ausente' })
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = './uploads/estudiantes';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `temp-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes en formato JPG o PNG',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  actualizarFoto(
    @Req() req: RequestConEstudiante,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes enviar un archivo de imagen en el campo "foto"',
      );
    }
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.me.procesarSubidaFoto(req.estudiante.usuarioId, file, ip);
  }

  @Get('fotos')
  @ApiOperation({ summary: 'Obtener historial de fotos del estudiante' })
  historialFotos(@Req() req: RequestConEstudiante) {
    return this.me.historialFotos(req.estudiante.usuarioId);
  }

  @Get('examenes')
  @ApiOperation({ summary: 'Listar exámenes del estudiante' })
  examenes(@Req() req: RequestConEstudiante) {
    return this.me.examenes(req.estudiante.estudianteId);
  }

  @Get('qr')
  @ApiOperation({ summary: 'Generar token QR personal de acceso a examen' })
  qr(@Req() req: RequestConEstudiante) {
    return this.me.qrPersonal(req.estudiante.estudianteId);
  }
}
