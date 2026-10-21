import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginEstudianteDto } from './dto/login-estudiante.dto';

export const JWT_ESTUDIANTE_SECRET =
  process.env.JWT_ESTUDIANTE_SECRET ?? 'dev-estudiante-secret';

const MAX_INTENTOS = 5; // pendiente de confirmar con el equipo
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
// Hash ficticio: se compara cuando el SIS no existe, para que el tiempo
// de respuesta sea parecido y no se revele cuál dato falló.
const HASH_FICTICIO = bcrypt.hashSync('hash-ficticio-no-usar', 10);

@Injectable()
export class EstudianteAuthService {
  private fallos = new Map<string, { n: number; hasta?: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginEstudianteDto, ip?: string) {
    const { sis, ci } = dto;

    const registro = this.fallos.get(sis);
    if (registro?.hasta && registro.hasta > Date.now()) {
      throw new HttpException(
        'Acceso bloqueado temporalmente por demasiados intentos. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { cod_sis: sis },
      include: { usuario: true },
    });

    const hash = estudiante?.usuario?.password ?? HASH_FICTICIO;
    const ok = await bcrypt.compare(ci, hash);

    if (!estudiante || !estudiante.usuario || !ok) {
      await this.registrarFallo(sis, ip);
      throw new UnauthorizedException('Código SIS o CI incorrectos');
    }

    this.fallos.delete(sis);

    const payload = {
      sub: estudiante.usuario.id,
      usuarioId: estudiante.usuario.id,
      estudianteId: estudiante.id,
      tipo: 'estudiante',
    };
    const access_token = this.jwt.sign(payload, {
      secret: JWT_ESTUDIANTE_SECRET,
      expiresIn: '8h',
    });

    return {
      access_token,
      estudiante: {
        id: estudiante.id,
        nombre: `${estudiante.nombre} ${estudiante.apellido ?? ''}`.trim(),
      },
    };
  }

  private async registrarFallo(sis: string, ip?: string) {
    const actual = this.fallos.get(sis) ?? { n: 0 };
    actual.n += 1;
    let accion = 'LOGIN_ESTUDIANTE_FALLIDO';
    if (actual.n >= MAX_INTENTOS) {
      actual.hasta = Date.now() + BLOQUEO_MS;
      actual.n = 0;
      accion = 'LOGIN_ESTUDIANTE_BLOQUEO';
    }
    this.fallos.set(sis, actual);

    await this.prisma.bitacora_Auditoria.create({
      data: {
        accion,
        modulo: 'Portal Estudiante',
        detallesNuevo: { sis },
        ipOrigen: ip?.slice(0, 45),
      },
    });
  }
}