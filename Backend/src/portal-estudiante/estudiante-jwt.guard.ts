import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JWT_ESTUDIANTE_SECRET } from './estudiante-auth.service';

@Injectable()
export class EstudianteJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sesión no válida');

    let payload: any;
    try {
      // Con otro secreto, un token del dashboard falla aquí
      payload = this.jwt.verify(token, { secret: JWT_ESTUDIANTE_SECRET });
    } catch {
      throw new UnauthorizedException('Sesión no válida');
    }
    if (payload.tipo !== 'estudiante') {
      throw new UnauthorizedException('Sesión no válida');
    }

    // Si la solicitud trae un identificador de otro estudiante: 403
    const ajeno = [req.params, req.query, req.body]
      .filter(Boolean)
      .some((src: any) =>
        ['estudianteId', 'id_estudiante', 'usuarioId', 'sis', 'cod_sis'].some(
          (k) =>
            src[k] !== undefined &&
            String(src[k]) !== String(payload.estudianteId) &&
            String(src[k]) !== String(payload.usuarioId),
        ),
      );
    if (ajeno) {
      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId: payload.usuarioId,
          accion: 'ACCESO_DATOS_AJENOS',
          modulo: 'Portal Estudiante',
          detallesNuevo: { ruta: req.originalUrl },
          ipOrigen: req.ip?.slice(0, 45),
        },
      });
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    req.estudiante = {
      usuarioId: payload.usuarioId,
      estudianteId: payload.estudianteId,
    };
    return true;
  }
}