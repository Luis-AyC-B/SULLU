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
import { PrismaService } from '../prisma/prisma.service';
import { jwtSecret } from '../auth/jwt-secret';
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

    let payload: { sub?: number; usuarioId?: number; email?: string };
    try {
      // Priorizar token del login unificado con JWT_SECRET
      payload = this.jwt.verify(token, { secret: jwtSecret });
    } catch {
      try {
        // Compatibilidad con token previo de estudiante
        payload = this.jwt.verify(token, { secret: JWT_ESTUDIANTE_SECRET });
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

    // Verificar que realmente tenga el rol Estudiante
    const esEstudiante = usuario.roles?.some(
      (r) => r.rol?.nombre === 'Estudiante',
    );
    if (!esEstudiante || !usuario.estudiante) {
      throw new ForbiddenException('Acceso restringido a estudiantes');
    }

    // Si la solicitud trae un identificador de otro estudiante: 403
    const ajeno = [req.params, req.query, req.body]
      .filter(Boolean)
      .some((src: Record<string, unknown>) =>
        ['estudianteId', 'id_estudiante', 'usuarioId', 'sis', 'cod_sis'].some(
          (k) =>
            src[k] !== undefined &&
            String(src[k]) !== String(usuario.estudiante!.id) &&
            String(src[k]) !== String(usuario.id) &&
            String(src[k]) !== String(usuario.estudiante!.cod_sis),
        ),
      );

    if (ajeno) {
      await this.prisma.bitacora_Auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'ACCESO_DATOS_AJENOS',
          modulo: 'Portal Estudiante',
          detallesNuevo: { ruta: req.originalUrl },
          ipOrigen: req.ip?.slice(0, 45),
        },
      });
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    // Si debe cambiar contraseña, bloquear rutas que no sean de cambio de contraseña o perfil
    if (usuario.debeCambiarPassword) {
      const url = (req.originalUrl || req.url || '').toLowerCase();
      const esRutaExenta =
        url.includes('/password') ||
        url.includes('/perfil') ||
        url.includes('/foto');

      if (!esRutaExenta) {
        throw new HttpException(
          {
            codigo: 'DEBE_CAMBIAR_PASSWORD',
            message: 'Debes cambiar tu contraseña antes de continuar.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    req.estudiante = {
      usuarioId: usuario.id,
      estudianteId: usuario.estudiante.id,
      estudiante: usuario.estudiante,
    };

    req.user = {
      id: usuario.id,
      email: usuario.correo,
      nombre: usuario.nombre,
      rol: 'Estudiante',
      debeCambiarPassword: usuario.debeCambiarPassword,
    };

    return true;
  }
}