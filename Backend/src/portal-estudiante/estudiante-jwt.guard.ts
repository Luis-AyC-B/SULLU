import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Estudiante } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { jwtSecret } from '../auth/jwt-secret';
import { JWT_ESTUDIANTE_SECRET } from './estudiante-auth.service';

export interface EstudianteRequest extends Request {
  estudiante?: {
    usuarioId: number;
    estudianteId: number;
    estudiante: Estudiante;
  };
  user?: {
    id: number;
    email: string | null;
    nombre: string;
    rol: string;
    debeConfigurarPerfil: boolean;
    debeCambiarPassword: boolean;
  };
}

interface JwtTokenPayload {
  sub?: number;
  usuarioId?: number;
  email?: string;
  sessionId?: string;
  roles?: string[];
  tipo?: string;
}

@Injectable()
export class EstudianteJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<EstudianteRequest>();
    const authHeader = req.headers?.authorization;
    const header: string = typeof authHeader === 'string' ? authHeader : '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sesión no válida');

    let payload: JwtTokenPayload;
    try {
      // Priorizar token del login general con jwtSecret
      payload = this.jwt.verify<JwtTokenPayload>(token, { secret: jwtSecret });
    } catch {
      try {
        // Fallback para tokens emitidos por estudiante-auth
        payload = this.jwt.verify<JwtTokenPayload>(token, {
          secret: JWT_ESTUDIANTE_SECRET,
        });
      } catch {
        throw new UnauthorizedException('Sesión no válida');
      }
    }

    const usuarioId = payload.sub || payload.usuarioId;
    if (!usuarioId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    // Consulta a BD para no confiar en el JWT estático
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: Number(usuarioId) },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
        estudiante: true,
      },
    });

    if (!usuario || usuario.deletedAt !== null) {
      throw new UnauthorizedException('Sesión no válida o cuenta inactiva');
    }

    // Verificación de concurrencia: sesión única activa
    if (
      usuario.sessionId &&
      payload.sessionId &&
      usuario.sessionId !== payload.sessionId
    ) {
      throw new UnauthorizedException(
        'Sesión inválida o expirada. Has iniciado sesión en otro dispositivo.',
      );
    }

    // Verificar que realmente tenga el rol Estudiante o estudiante asociado
    const esEstudiante = usuario.roles?.some(
      (r) => r.rol?.nombre === 'Estudiante',
    );
    if (!esEstudiante && !usuario.estudiante) {
      throw new ForbiddenException('Acceso restringido a estudiantes');
    }

    if (!usuario.estudiante) {
      throw new ForbiddenException(
        'No cuenta con un registro de estudiante asociado',
      );
    }

    const estudianteActual = usuario.estudiante;

    // Anti-IDOR: Si la solicitud intenta acceder o manipular id de otro estudiante
    const reqBody =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};
    const fuentes: Record<string, unknown>[] = [
      req.params as Record<string, unknown>,
      req.query as Record<string, unknown>,
      reqBody,
    ].filter(Boolean);

    const keys = [
      'estudianteId',
      'id_estudiante',
      'usuarioId',
      'sis',
      'cod_sis',
    ];
    const ajeno = fuentes.some((src) =>
      keys.some((k) => {
        const val = src[k];
        if (typeof val === 'string' || typeof val === 'number') {
          const strVal = String(val);
          return (
            strVal !== String(estudianteActual.id) &&
            strVal !== String(usuario.id) &&
            strVal !== String(estudianteActual.cod_sis)
          );
        }
        return false;
      }),
    );

    if (ajeno) {
      const ruta = typeof req.originalUrl === 'string' ? req.originalUrl : '';
      const ip = typeof req.ip === 'string' ? req.ip.slice(0, 45) : undefined;
      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'ACCESO_DATOS_AJENOS',
          modulo: 'Portal Estudiante',
          detallesNuevo: { ruta },
          ipOrigen: ip,
        },
      });
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    // Si debe configurar perfil, bloquear todas las demás rutas del portal
    const debeConfigurar =
      usuario.debeConfigurarPerfil ||
      usuario.debeCambiarPassword ||
      !estudianteActual.perfilCompleto;

    if (debeConfigurar) {
      const rutaOriginal =
        typeof req.originalUrl === 'string' ? req.originalUrl : '';
      const rutaAlt = typeof req.url === 'string' ? req.url : '';
      const url = (rutaOriginal || rutaAlt).toLowerCase();
      const esRutaExenta =
        url.includes('password') ||
        url.includes('/perfil') ||
        url.includes('/foto');

      if (!esRutaExenta) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            codigo: 'PERFIL_INCOMPLETO',
            message:
              'Debes completar la configuración de tu perfil antes de continuar.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    req.estudiante = {
      usuarioId: usuario.id,
      estudianteId: estudianteActual.id,
      estudiante: estudianteActual,
    };

    req.user = {
      id: usuario.id,
      email: usuario.correo,
      nombre: usuario.nombre,
      rol: 'Estudiante',
      debeConfigurarPerfil: usuario.debeConfigurarPerfil,
      debeCambiarPassword: usuario.debeCambiarPassword,
    };

    return true;
  }
}
