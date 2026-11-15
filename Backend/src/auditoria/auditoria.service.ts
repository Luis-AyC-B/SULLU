import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultaAuditoriaDto } from './dto/consulta-auditoria.dto';
import { generarPdfAuditoria, type EventoAuditoriaPdf } from './auditoria.pdf';
import {
  claveRegistro,
  etiquetaCampo,
  nombreAccion,
  textoValor,
} from './auditoria.pdf';
import { ROL_ADMINISTRADOR_ID } from '../usuarios/usuarios.constants';

const seleccion = {
  id: true,
  usuarioId: true,
  usuarioNombre: true,
  accion: true,
  tablaAfectada: true,
  registroId: true,
  registroClave: true,
  detallesAnterior: true,
  detallesNuevo: true,
  fechaHora: true,
} satisfies Prisma.Bitacora_AuditoriaSelect;
const accionesCrud = ['CREACION', 'MODIFICACION', 'ELIMINACION'];
const soloCrud: Prisma.Bitacora_AuditoriaWhereInput = {
  accion: { in: accionesCrud },
};
type Evento = Prisma.Bitacora_AuditoriaGetPayload<{ select: typeof seleccion }>;
type EventoIdentificado = Evento & {
  registroDescripcion?: string | null;
};

const esObjeto = (dato: Prisma.JsonValue | null): Prisma.JsonObject =>
  dato && typeof dato === 'object' && !Array.isArray(dato) ? dato : {};

const fechaBolivia = (fecha: Date) =>
  fecha.toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

export function eventoParaPdf(evento: EventoIdentificado): EventoAuditoriaPdf {
  const comparar =
    evento.accion === 'MODIFICACION' ||
    (evento.accion === 'ELIMINACION' && evento.detallesNuevo !== null);
  const datos = evento.detallesNuevo ?? evento.detallesAnterior;
  const objeto =
    datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  const titulos: Record<string, string> = {
    CREACION: 'Datos registrados',
    MODIFICACION: 'Cambios registrados',
    ELIMINACION: 'Datos de la eliminación',
  };
  return {
    id: evento.id,
    fecha: fechaBolivia(evento.fechaHora),
    usuario: evento.usuarioNombre ?? 'Sistema',
    accion: nombreAccion(evento.accion),
    tabla: evento.tablaAfectada ?? 'No aplica',
    registro: [
      evento.registroDescripcion,
      claveRegistro(evento.registroClave, evento.registroId),
    ]
      .filter(Boolean)
      .join(' · '),
    comparar,
    tituloDetalle: titulos[evento.accion] ?? 'Información de la operación',
    filas: comparar
      ? cambiosParaVista(evento.detallesAnterior, evento.detallesNuevo).map(
          (c) => ({
            campo: etiquetaCampo(c.campo),
            anterior: textoValor(c.anterior),
            valor: textoValor(c.nuevo),
          }),
        )
      : Object.entries(objeto)
          .filter(
            ([campo]) =>
              !['_registro', '_referencias', 'origen'].includes(campo),
          )
          .map(([campo, valor]) => ({
            campo: etiquetaCampo(campo),
            valor: textoValor(valor),
          })),
  };
}

export function periodoAuditoria(
  dto: ConsultaAuditoriaDto,
  ahora = new Date(),
) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ahora);
  const anio = dto.anio ?? Number(partes.find((p) => p.type === 'year')?.value);
  const mes = dto.mes ?? Number(partes.find((p) => p.type === 'month')?.value);
  // Timestamps nuevos en UTC; intervalos [inicio, fin) del mes boliviano.
  const desde = new Date(Date.UTC(anio, mes - 1, 1, 4));
  const hasta = new Date(Date.UTC(anio, mes, 1, 4));
  return { anio, mes, desde, hasta };
}

export function cambiosAuditoria(
  anterior: Prisma.JsonValue | null,
  nuevo: Prisma.JsonValue | null,
) {
  const a =
    anterior && typeof anterior === 'object' && !Array.isArray(anterior)
      ? anterior
      : {};
  const n =
    nuevo && typeof nuevo === 'object' && !Array.isArray(nuevo) ? nuevo : {};
  return [...new Set([...Object.keys(a), ...Object.keys(n)])]
    .filter((campo) => !['_registro', '_referencias', 'origen'].includes(campo))
    .filter((campo) => JSON.stringify(a[campo]) !== JSON.stringify(n[campo]))
    .map((campo) => ({
      campo,
      anterior: a[campo] ?? null,
      nuevo: n[campo] ?? null,
    }));
}

export function cambiosParaVista(
  anterior: Prisma.JsonValue | null,
  nuevo: Prisma.JsonValue | null,
) {
  const a = esObjeto(esObjeto(anterior)._referencias ?? null);
  const n = esObjeto(esObjeto(nuevo)._referencias ?? null);
  const referencia = (
    valor: Prisma.JsonValue,
    nombre: Prisma.JsonValue | undefined,
  ) =>
    valor !== null && typeof nombre === 'string'
      ? `${nombre} (#${textoValor(valor)})`
      : valor;
  return cambiosAuditoria(anterior, nuevo).map((cambio) => ({
    campo:
      a[cambio.campo] || n[cambio.campo]
        ? etiquetaCampo(cambio.campo)
        : cambio.campo,
    anterior: referencia(cambio.anterior, a[cambio.campo]),
    nuevo: referencia(cambio.nuevo, n[cambio.campo]),
  }));
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  private async identificar(eventos: Evento[]): Promise<EventoIdentificado[]> {
    if (!eventos.length) return [];
    // Una sola consulta para los eventos anteriores a las instantáneas descriptivas.
    // No se reescribe el historial ni se presentan datos actuales como valores iniciales.
    const referencias = await this.prisma.$queryRaw<
      {
        id: number;
        descripcion: string | null;
        anterior: Prisma.JsonObject;
        nuevo: Prisma.JsonObject;
      }[]
    >`
          SELECT (e->>'id')::integer AS id,
            auditoria_identificar_registro(e->>'tabla', coalesce(nullif(e->'nuevo','null'::jsonb),e->'anterior')) AS descripcion,
            coalesce(e->'anterior'->'_referencias',auditoria_referencias(e->'anterior')) AS anterior,
            coalesce(e->'nuevo'->'_referencias',auditoria_referencias(e->'nuevo')) AS nuevo
          FROM jsonb_array_elements(${JSON.stringify(
            eventos.map((e) => ({
              id: e.id,
              tabla: e.tablaAfectada,
              anterior: e.detallesAnterior,
              nuevo: e.detallesNuevo,
            })),
          )}::jsonb) e
        `;
    const nombres = new Map(referencias.map((r) => [r.id, r]));
    return eventos.map((evento) => {
      const datos = esObjeto(evento.detallesNuevo);
      const resuelto = nombres.get(evento.id);
      const relacion = [
        'rol_permiso',
        'rol_modulo',
        'usuario_rol',
        'usuario_alcance',
      ].includes(evento.tablaAfectada ?? '');
      const nombre =
        datos.clave ??
        esObjeto(evento.detallesAnterior).clave ??
        datos._registro ??
        esObjeto(evento.detallesAnterior)._registro;
      return {
        ...evento,
        detallesAnterior:
          evento.detallesAnterior === null
            ? null
            : {
                ...esObjeto(evento.detallesAnterior),
                _referencias: resuelto?.anterior ?? {},
              },
        detallesNuevo:
          evento.detallesNuevo === null
            ? null
            : { ...datos, _referencias: resuelto?.nuevo ?? {} },
        registroDescripcion:
          relacion &&
          !datos._referencias &&
          !esObjeto(evento.detallesAnterior)._referencias &&
          resuelto?.descripcion
            ? resuelto.descripcion
            : typeof nombre === 'string'
              ? nombre
              : (resuelto?.descripcion ?? null),
      };
    });
  }

  async administrador(usuarioId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        deletedAt: null,
        roles: {
          some: {
            rol: {
              deletedAt: null,
              OR: [{ id: ROL_ADMINISTRADOR_ID }, { nombre: 'Administrador' }],
            },
          },
        },
      },
      select: { id: true, nombre: true, apellido: true },
    });
    if (!usuario)
      throw new ForbiddenException(
        'Solo administradores pueden acceder a la auditoría.',
      );
    return usuario;
  }

  private filtros(
    dto: ConsultaAuditoriaDto,
  ): Prisma.Bitacora_AuditoriaWhereInput {
    const { desde, hasta } = periodoAuditoria(dto);
    return {
      ...soloCrud,
      fechaHora: { gte: desde, lt: hasta },
      ...(dto.usuarioId !== undefined
        ? { usuarioId: dto.usuarioId === 0 ? null : dto.usuarioId }
        : {}),
      ...(dto.accion ? { accion: dto.accion } : {}),
      ...(dto.tabla ? { tablaAfectada: dto.tabla } : {}),
    };
  }

  async listar(dto: ConsultaAuditoriaDto, usuarioId: number) {
    await this.administrador(usuarioId);
    const where = this.filtros(dto);
    const [total, data] = await this.prisma.$transaction(
      [
        this.prisma.bitacora_Auditoria.count({ where }),
        this.prisma.bitacora_Auditoria.findMany({
          where,
          select: seleccion,
          orderBy: [{ fechaHora: 'desc' }, { id: 'desc' }],
          skip: (dto.pagina - 1) * dto.limite,
          take: dto.limite,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const { anio, mes } = periodoAuditoria(dto);
    return {
      data: (await this.identificar(data)).map((evento) => ({
        ...evento,
        fechaHora: evento.fechaHora.toISOString(),
      })),
      total,
      pagina: dto.pagina,
      limite: dto.limite,
      anio,
      mes,
    };
  }

  async opciones(usuarioId: number) {
    await this.administrador(usuarioId);
    const [usuarios, tablas, primero] = await this.prisma.$transaction([
      this.prisma.bitacora_Auditoria.findMany({
        where: soloCrud,
        distinct: ['usuarioId'],
        select: { usuarioId: true, usuarioNombre: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.bitacora_Auditoria.findMany({
        where: { ...soloCrud, tablaAfectada: { not: null } },
        distinct: ['tablaAfectada'],
        select: { tablaAfectada: true },
        orderBy: { tablaAfectada: 'asc' },
      }),
      this.prisma.bitacora_Auditoria.findFirst({
        where: soloCrud,
        orderBy: { fechaHora: 'asc' },
        select: { fechaHora: true },
      }),
    ]);
    return {
      usuarios,
      acciones: accionesCrud,
      tablas: tablas.map((t) => t.tablaAfectada),
      primerAnio: periodoAuditoria(
        new ConsultaAuditoriaDto(),
        primero?.fechaHora ?? new Date(),
      ).anio,
    };
  }

  async detalle(id: number, usuarioId: number) {
    await this.administrador(usuarioId);
    const evento = await this.prisma.bitacora_Auditoria.findFirst({
      where: { id, ...soloCrud },
      select: seleccion,
    });
    if (!evento) throw new NotFoundException('Operación no encontrada.');
    const [identificado] = await this.identificar([evento]);
    const claves = new Set([
      'id',
      ...Object.keys(esObjeto(evento.registroClave)),
    ]);
    const datosAnteriores = esObjeto(evento.detallesAnterior);
    const datosNuevos = esObjeto(evento.detallesNuevo);
    const anterior = datosAnteriores.clave ?? datosAnteriores._registro;
    const nuevo = datosNuevos.clave ?? datosNuevos._registro;
    const referencia = identificado.registroDescripcion;
    const identificacion = referencia
      ? [
          {
            campo:
              typeof anterior === 'string' || typeof nuevo === 'string'
                ? 'Registro afectado'
                : 'Registro afectado (referencia actual)',
            anterior: typeof anterior === 'string' ? anterior : null,
            nuevo:
              typeof nuevo === 'string'
                ? nuevo
                : evento.accion === 'ELIMINACION' &&
                    typeof anterior === 'string'
                  ? null
                  : referencia,
          },
        ]
      : [];
    const cambios = cambiosParaVista(
      identificado.detallesAnterior,
      identificado.detallesNuevo,
    ).filter(
      (cambio) => evento.accion === 'MODIFICACION' || !claves.has(cambio.campo),
    );
    return {
      ...identificado,
      fechaHora: evento.fechaHora.toISOString(),
      cambios: [
        ...(evento.accion === 'MODIFICACION' && cambios.length
          ? []
          : identificacion),
        ...cambios,
      ],
    };
  }

  async reporte(dto: ConsultaAuditoriaDto, usuarioId: number) {
    const admin = await this.administrador(usuarioId);
    const data = await this.prisma.bitacora_Auditoria.findMany({
      where: this.filtros(dto),
      select: seleccion,
      orderBy: [{ fechaHora: 'desc' }, { id: 'desc' }],
    });
    if (!data.length)
      throw new BadRequestException(
        'No hay operaciones para descargar con estos filtros.',
      );
    const { mes, anio } = periodoAuditoria(dto);
    const usuario =
      dto.usuarioId === undefined
        ? 'Todos los usuarios'
        : dto.usuarioId === 0
          ? 'Sistema'
          : (data.find((e) => e.usuarioId === dto.usuarioId)?.usuarioNombre ??
            `Usuario #${dto.usuarioId}`);
    const buffer = generarPdfAuditoria({
      periodo: `${String(mes).padStart(2, '0')}/${anio}`,
      administrador: `${admin.nombre} ${admin.apellido ?? ''}`.trim(),
      generado: fechaBolivia(new Date()),
      filtros: `${usuario} · ${dto.accion ? nombreAccion(dto.accion) : 'Todas las acciones'} · ${dto.tabla ?? 'Todas las tablas'}`,
      eventos: (await this.identificar(data)).map(eventoParaPdf),
    });
    return {
      buffer,
      nombre: `auditoria_${anio}_${String(mes).padStart(2, '0')}.pdf`,
    };
  }
}
