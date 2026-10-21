import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomUUID } from 'crypto';

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

interface UsuarioLoginData {
  id: number;
  nombre?: string | null;
  correo: string | null;
  debeCambiarPassword?: boolean | null;
  roles?: Array<{
    rol?: {
      nombre?: string;
      permisos?: Array<{
        permiso?: {
          clave?: string;
        };
      }>;
    };
  }>;
  estudiante?: {
    id: number;
    cod_sis?: string;
    perfilCompleto?: boolean;
  } | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Registro en memoria volátil de intentos fallidos por correo normalizado.
   * Limitación documentada: Al reiniciarse la instancia del servidor o en despliegues
   * horizontales multinstancia (ej. clúster o serverless), los contadores en memoria se
   * reinician. Para producción con escalabilidad horizontal se recomendaría Redis o DB.
   */
  private readonly fallosLogin = new Map<
    string,
    { intentos: number; bloqueadoHasta?: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string, ip?: string) {
    let cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Permitir ingresar código SIS directamente (ej. 201900123)
    if (/^\d{6,10}$/.test(cleanEmail)) {
      cleanEmail = `${cleanEmail}@est.umss.edu.bo`;
    }

    const registro = this.fallosLogin.get(cleanEmail);
    if (registro?.bloqueadoHasta && registro.bloqueadoHasta > Date.now()) {
      throw new HttpException(
        'Demasiados intentos fallidos. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        correo: { equals: cleanEmail, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: {
                  include: {
                    permiso: true,
                  },
                },
              },
            },
          },
        },
        estudiante: true,
      },
    });

    // Hash ficticio para igualar tiempos de respuesta y evitar enumeración de usuarios
    const passwordHash =
      usuario?.password ||
      '$2b$10$e8wVf5999Y7EwU/Uj4yGfe41J3o03e7eC7y44mQ06kGvD70000000';
    const passwordValida = await bcrypt.compare(password, passwordHash);

    if (!usuario || !usuario.password || !passwordValida) {
      await this.registrarFalloLogin(cleanEmail, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Éxito: limpiar registro de fallos
    this.fallosLogin.delete(cleanEmail);
    return usuario;
  }

  private async registrarFalloLogin(cleanEmail: string, ip?: string) {
    const actual = this.fallosLogin.get(cleanEmail) ?? { intentos: 0 };
    actual.intentos += 1;
    let accion = 'LOGIN_FALLIDO';

    if (actual.intentos >= MAX_INTENTOS) {
      actual.bloqueadoHasta = Date.now() + BLOQUEO_MS;
      actual.intentos = 0;
      accion = 'LOGIN_BLOQUEO_INTENTOS';
      this.logger.warn(
        `Usuario bloqueado por 15 min por superar 5 intentos fallidos: ${cleanEmail}`,
      );
    }

    this.fallosLogin.set(cleanEmail, actual);

    try {
      await this.prisma.bitacora_Auditoria.create({
        data: {
          accion,
          modulo: 'AUTH',
          detallesNuevo: { correo: cleanEmail },
          ipOrigen: ip?.slice(0, 45),
        },
      });
    } catch (auditErr: unknown) {
      const msg =
        auditErr instanceof Error ? auditErr.message : String(auditErr);
      this.logger.error(`Error auditando fallo de login: ${msg}`);
    }
  }

  async login(usuario: UsuarioLoginData) {
    const permisosUsuario: string[] = [];
    if (usuario.roles && Array.isArray(usuario.roles)) {
      usuario.roles.forEach((ur) => {
        if (ur.rol && ur.rol.permisos && Array.isArray(ur.rol.permisos)) {
          ur.rol.permisos.forEach((rp) => {
            if (rp.permiso && rp.permiso.clave) {
              permisosUsuario.push(rp.permiso.clave);
            }
          });
        }
      });
    }

    // Fallback de seguridad para el administrador principal si viniera vacío
    if (
      permisosUsuario.length === 0 &&
      usuario.correo === 'admin@exacontrol.com'
    ) {
      permisosUsuario.push(
        'usuarios.ver',
        'usuarios.crear',
        'usuarios.editar',
        'usuarios.desactivar',
        'roles.ver',
        'roles.crear',
        'roles.editar',
        'roles.eliminar',
        'estudiantes.ver',
        'estudiantes.cargar',
        'estudiantes.habilitar',
        'examenes.ver',
        'examenes.crear',
        'examenes.editar',
        'examenes.eliminar',
      );
    }

    // Extraer rol principal
    const rolNombre = usuario.roles?.[0]?.rol?.nombre || '';
    const esEstudiante = usuario.roles?.some(
      (r) => r.rol?.nombre === 'Estudiante',
    );

    if (esEstudiante && !permisosUsuario.includes('portal_estudiante')) {
      permisosUsuario.push('portal_estudiante');
    }

    // Generar sessionId único para todos los usuarios (incluidos estudiantes)
    // para garantizar sesión única activa y control de concurrencia
    const sessionId = randomUUID();
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { sessionId },
    });

    const payload = {
      sub: usuario.id,
      nombre: usuario.nombre,
      email: usuario.correo,
      permisos: permisosUsuario,
      rol: rolNombre,
      sessionId,
      estudianteId: usuario.estudiante?.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.correo,
        permisos: permisosUsuario,
        rol: rolNombre,
        debeCambiarPassword: usuario.debeCambiarPassword ?? false,
        perfilCompleto: usuario.estudiante?.perfilCompleto ?? false,
      },
    };
  }

  async solicitarRecuperacion(email: string) {
    const cleanEmail = email?.trim().toLowerCase();
    this.logger.log(
      `[solicitarRecuperacion] Solicitud para: "${email}" (normalizado: "${cleanEmail}")`,
    );

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        correo: { equals: cleanEmail, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    // Respuesta neutra para no revelar si el correo existe
    if (!usuario) {
      this.logger.warn(
        `[solicitarRecuperacion] No existe usuario con correo: "${cleanEmail}"`,
      );
      return {
        message:
          'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.',
      };
    }

    this.logger.log(
      `[solicitarRecuperacion] Usuario encontrado: id=${usuario.id}. Creando token...`,
    );

    if (!usuario.correo) {
      this.logger.warn(
        `[solicitarRecuperacion] El usuario id=${usuario.id} no tiene correo`,
      );
      return {
        message:
          'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.',
      };
    }

    try {
      // Invalidar tokens anteriores no usados del mismo usuario
      await this.prisma.tokenRecuperacion.updateMany({
        where: { usuarioId: usuario.id, usado: false },
        data: { usado: true },
      });

      const token = randomUUID();
      const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await this.prisma.tokenRecuperacion.create({
        data: {
          token,
          usuarioId: usuario.id,
          expiraEn,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const link = `${frontendUrl}/recuperar-password?token=${token}`;

      this.logger.log(
        `[solicitarRecuperacion] Enviando correo de recuperación a ${usuario.correo}...`,
      );
      await this.mailService.enviarRecuperacion(
        usuario.correo,
        usuario.nombre ?? '',
        link,
      );
      this.logger.log(
        `[solicitarRecuperacion] Correo enviado exitosamente a ${usuario.correo}`,
      );
    } catch (error) {
      this.logger.error(
        `[solicitarRecuperacion] ERROR al procesar token o envío de correo:`,
        error,
      );
      throw error;
    }

    return {
      message:
        'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.',
    };
  }

  async resetearPassword(token: string, nuevaPassword: string) {
    const registro = await this.prisma.tokenRecuperacion.findUnique({
      where: { token },
    });

    if (!registro || registro.usado || registro.expiraEn < new Date()) {
      throw new BadRequestException(
        'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.',
      );
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { password: passwordHash, debeCambiarPassword: false },
      }),
      this.prisma.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
    ]);

    return { message: 'Contraseña actualizada exitosamente.' };
  }
}
