import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';

export interface AuditContext {
  usuarioId?: number;
  ip?: string;
  enTransaccion?: boolean;
  bajaExamenId?: number;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();

type Datos = Record<string, unknown>;
const objeto = (valor: unknown): Datos =>
  valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Datos)
    : {};
const modelos = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const delegados = new Map(
  [...modelos.keys()].map((m) => [m.charAt(0).toLowerCase() + m.slice(1), m]),
);
const lecturas = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);
const combinar = (where: unknown, visible: Datos): Datos =>
  Object.keys(visible).length
    ? { AND: [objeto(where), visible] }
    : objeto(where);

function visibles(modelo: string): Datos {
  if (modelo === 'Examen') return { estado: { not: 'CANCELADO' } };
  if (modelo === 'ExamenControlador')
    return { deletedAt: null, examen: { estado: { not: 'CANCELADO' } } };
  if (
    [
      'Ingreso',
      'IncidenciaIngreso',
      'Examen_Estudiante',
      'Examen_Carrera_Materia',
    ].includes(modelo)
  )
    return { examen: { estado: { not: 'CANCELADO' } } };
  if (modelo === 'CodigoQr')
    return {
      OR: [{ examen: null }, { examen: { estado: { not: 'CANCELADO' } } }],
    };
  return {};
}

function relaciones(modelo: string, where: unknown): Datos {
  const salida = { ...objeto(where) };
  for (const operador of ['AND', 'OR', 'NOT']) {
    if (salida[operador])
      salida[operador] = Array.isArray(salida[operador])
        ? (salida[operador] as unknown[]).map((v) => relaciones(modelo, v))
        : relaciones(modelo, salida[operador]);
  }
  for (const campo of modelos.get(modelo)?.fields ?? []) {
    if (campo.kind !== 'object' || !salida[campo.name]) continue;
    const filtro = { ...objeto(salida[campo.name]) };
    if (campo.isList) {
      for (const op of ['some', 'none', 'every']) {
        if (!(op in filtro)) continue;
        const condicion = relaciones(campo.type, filtro[op]);
        const visible = visibles(campo.type);
        filtro[op] =
          op === 'every' && Object.keys(visible).length
            ? { OR: [{ NOT: visible }, condicion] }
            : combinar(condicion, visible);
      }
      salida[campo.name] = filtro;
    } else {
      salida[campo.name] = relaciones(campo.type, filtro);
    }
  }
  return salida;
}

function lectura(modelo: string, entrada: Datos, unica: boolean): Datos {
  const where = relaciones(modelo, entrada.where);
  const visible = visibles(modelo);
  const condiciones = Array.isArray(where.AND)
    ? (where.AND as unknown[])
    : where.AND
      ? [where.AND]
      : [];
  // findUnique requiere conservar la clave única en el nivel superior.
  const salida: Datos = {
    ...entrada,
    where: unica
      ? { ...where, AND: [...condiciones, visible] }
      : combinar(where, visible),
  };
  for (const seleccion of ['include', 'select']) {
    if (!entrada[seleccion]) continue;
    const campos = { ...objeto(entrada[seleccion]) };
    for (const campo of modelos.get(modelo)?.fields ?? []) {
      if (campo.kind !== 'object' || !campos[campo.name]) continue;
      const opciones = objeto(campos[campo.name]);
      const anidado = lectura(campo.type, opciones, false);
      if (!campo.isList) delete anidado.where;
      campos[campo.name] = anidado;
    }
    salida[seleccion] = campos;
  }
  return salida;
}

export function delegadoAuditoria(modelo: string, delegado: object): object {
  return new Proxy(delegado, {
    get(target, propiedad, receiver): unknown {
      const original: unknown = Reflect.get(target, propiedad, receiver);
      if (typeof propiedad !== 'string' || typeof original !== 'function')
        return original;
      return (entrada: Datos = {}) => {
        let metodo = propiedad;
        let args = entrada;
        if (lecturas.has(metodo))
          args = lectura(modelo, args, metodo.startsWith('findUnique'));
        if (
          (metodo === 'delete' || metodo === 'deleteMany') &&
          ['Usuario', 'Rol', 'Examen', 'ExamenControlador'].includes(modelo)
        ) {
          metodo = metodo === 'delete' ? 'update' : 'updateMany';
          args = {
            ...args,
            data:
              modelo === 'Examen'
                ? { estado: 'CANCELADO' }
                : { deletedAt: new Date() },
          };
        }
        if (modelo === 'ExamenControlador' && metodo === 'create') {
          const data = objeto(args.data);
          metodo = 'upsert';
          args = {
            ...args,
            data: undefined,
            where: {
              examenId_colaboradorId: {
                examenId: data.examenId,
                colaboradorId: data.colaboradorId,
              },
              deletedAt: { not: null },
            },
            create: data,
            update: { ...data, deletedAt: null, fechaAsignacion: new Date() },
          };
        }
        if (
          metodo === 'deleteMany' &&
          ['Ingreso', 'Examen_Carrera_Materia'].includes(modelo) &&
          auditContext.getStore()?.bajaExamenId ===
            objeto(args.where).examenId &&
          auditContext.getStore()?.bajaExamenId !== undefined
        ) {
          // La cancelación conserva también las relaciones que el servicio antiguo intentaba borrar.
          args = { ...args, where: combinar(args.where, { examenId: -1 }) };
        }
        const ejecutar = Reflect.get(target, metodo) as (
          args: Datos,
        ) => unknown;
        return Reflect.apply(ejecutar, target, [args]);
      };
    },
  });
}

export function clienteAuditoria<T extends object>(cliente: T): T {
  const cache = new Map<string, object>();
  return new Proxy(cliente, {
    get(target, propiedad, receiver): unknown {
      const valor: unknown = Reflect.get(target, propiedad, receiver);
      const modelo =
        typeof propiedad === 'string' ? delegados.get(propiedad) : undefined;
      if (modelo && valor && typeof valor === 'object') {
        if (!cache.has(modelo))
          cache.set(modelo, delegadoAuditoria(modelo, valor));
        return cache.get(modelo);
      }
      return typeof valor === 'function'
        ? (valor as (...args: unknown[]) => unknown).bind(target)
        : valor;
    },
  });
}
