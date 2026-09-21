/* eslint-disable no-console */
/**
 * Seed MOCK de RESERVAS DE AMBIENTES.
 * Ubicación sugerida: Backend/prisma/seed-mock-reservas.ts
 *
 * Ejecutar (después del seed del equipo y de seed-mock.ts):
 *   npx ts-node prisma/seed-mock-reservas.ts
 *
 * - Usa los usuarios que ya creó seed-mock.ts (ver@, registra@, habilita@,
 *   completo@, sinacceso@ sullu.test) y los ambientes existentes.
 * - Todas las reservas son a partir de MAÑANA (nunca hoy ni en el pasado).
 * - Es idempotente: borra y recrea solo lo marcado con [MOCK-RES].
 * - No pisa horarios: verifica choques contra las reservas que ya existen
 *   en la BD (incluidas las de los exámenes de seed-mock.ts).
 */
import { PrismaClient, EstadoAula } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MARCA = '[MOCK-RES]';
const PASSWORD = 'Test1234!';

/**
 * Usuario nuevo, creado por este script (no viene de seed-mock.ts).
 * Reutiliza el rol "MOCK Estudiantes - Solo ver" si existe; si no, lo crea vacío.
 */
const USUARIO_NUEVO = {
  correo: 'reserva@sullu.test',
  nombre: 'Rodrigo',
  apellido: 'Reserva',
  rol: 'MOCK Estudiantes - Solo ver',
};

/** Cuántas reservas futuras querés para cada usuario */
const RESERVAS_POR_USUARIO: { correo: string; cantidad: number }[] = [
  { correo: 'ver@sullu.test', cantidad: 3 },
  { correo: 'registra@sullu.test', cantidad: 5 },
  { correo: 'habilita@sullu.test', cantidad: 4 },
  { correo: 'completo@sullu.test', cantidad: 8 },
  { correo: 'sinacceso@sullu.test', cantidad: 2 },
  // usuario nuevo: solo 2 aulas reservadas
  { correo: USUARIO_NUEVO.correo, cantidad: 2 },
];

/** Horizonte: desde mañana (día 1) hasta día 45 */
const DIA_DESDE = 1;
const DIA_HASTA = 45;

/** Bloques horarios candidatos [inicio, fin] */
const SLOTS: [number, number][] = [
  [7, 9],
  [9, 11],
  [11, 13],
  [14, 16],
  [16, 18],
  [18, 20],
];

const MOTIVOS = [
  'Clase de recuperación',
  'Examen práctico de laboratorio',
  'Defensa de proyecto final',
  'Reunión de coordinación docente',
  'Taller de refuerzo',
  'Simulacro de examen',
  'Capacitación interna',
  'Auxiliatura de consulta',
  'Presentación de avances',
  'Evaluación oral',
];

// ---------- helpers ----------
function fechaRelativa(dias: number): Date {
  const hoy = new Date();
  return new Date(
    Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias),
  );
}

function hora(h: number): Date {
  return new Date(Date.UTC(1970, 0, 1, h, 0, 0));
}

/** PRNG determinístico para que cada corrida dé el mismo resultado */
function crearRandom(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Slot = { dia: number; ambienteId: number; h: [number, number] };

function seSolapan(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

async function main() {
  console.log('Iniciando seed mock de reservas de ambientes...');

  // 1) Limpieza de corridas anteriores (solo lo marcado como [MOCK-RES])
  const viejas = await prisma.reservaAmbiente.findMany({
    where: { motivo: { startsWith: MARCA } },
    select: { id: true },
  });
  const viejasIds = viejas.map((r) => r.id);
  if (viejasIds.length > 0) {
    // por si alguna quedó enlazada a un examen
    await prisma.examen.deleteMany({
      where: { reservaAmbienteId: { in: viejasIds } },
    });
    await prisma.reservaAmbiente.deleteMany({
      where: { id: { in: viejasIds } },
    });
    console.log(`  Se eliminaron ${viejasIds.length} reservas mock anteriores`);
  }

  // 2) Usuario nuevo (se crea acá, no depende de seed-mock.ts)
  const rolNuevo = await prisma.rol.upsert({
    where: { nombre: USUARIO_NUEVO.rol },
    update: {},
    create: {
      nombre: USUARIO_NUEVO.rol,
      descripcion: `${MARCA} Rol de prueba para reservas`,
    },
  });

  const creado = await prisma.usuario.upsert({
    where: { correo: USUARIO_NUEVO.correo },
    update: { password: await bcrypt.hash(PASSWORD, 10) },
    create: {
      nombre: USUARIO_NUEVO.nombre,
      apellido: USUARIO_NUEVO.apellido,
      correo: USUARIO_NUEVO.correo,
      password: await bcrypt.hash(PASSWORD, 10),
    },
  });

  await prisma.usuario_Rol.deleteMany({ where: { usuarioId: creado.id } });
  await prisma.usuario_Rol.create({
    data: { usuarioId: creado.id, rolId: rolNuevo.id },
  });

  // Alcance sobre todas las facultades
  const facultades = await prisma.facultad.findMany({ select: { id: true } });
  await prisma.usuario_Alcance.deleteMany({ where: { usuarioId: creado.id } });
  await prisma.usuario_Alcance.createMany({
    data: facultades.map((f) => ({ usuarioId: creado.id, facultadId: f.id })),
  });
  console.log(`  Usuario nuevo listo: ${USUARIO_NUEVO.correo} / ${PASSWORD}`);

  // 3) Usuarios y ambientes existentes
  const correos = RESERVAS_POR_USUARIO.map((u) => u.correo);
  const usuarios = await prisma.usuario.findMany({
    where: { correo: { in: correos } },
    select: { id: true, correo: true, nombre: true, apellido: true },
  });
  if (usuarios.length === 0) {
    throw new Error(
      'No se encontraron los usuarios mock. Corré primero: npx ts-node prisma/seed-mock.ts',
    );
  }
  const usuarioPorCorreo = new Map(usuarios.map((u) => [u.correo, u]));

  const ambientes = await prisma.ambiente.findMany({
    select: { id: true, nombre: true, capacidad: true },
    orderBy: { id: 'asc' },
  });
  if (ambientes.length === 0) {
    throw new Error('No hay ambientes en la BD. Corré primero los seeds base.');
  }

  // 4) Reservas ya existentes en el rango, para no chocar horarios
  const desde = fechaRelativa(DIA_DESDE);
  const hasta = fechaRelativa(DIA_HASTA);
  const ocupadas = await prisma.reservaAmbiente.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    select: { ambienteId: true, fecha: true, horaIni: true, horaFin: true },
  });

  const ocupadasPorClave = new Map<string, [number, number][]>();
  for (const r of ocupadas) {
    const clave = `${r.ambienteId}|${r.fecha.toISOString().slice(0, 10)}`;
    const rango: [number, number] = [
      r.horaIni.getUTCHours(),
      r.horaFin.getUTCHours(),
    ];
    ocupadasPorClave.set(clave, [
      ...(ocupadasPorClave.get(clave) ?? []),
      rango,
    ]);
  }

  // 5) Slots candidatos libres (día × ambiente × bloque)
  const candidatos: Slot[] = [];
  for (let dia = DIA_DESDE; dia <= DIA_HASTA; dia++) {
    const fecha = fechaRelativa(dia);
    // sin fines de semana
    const diaSemana = fecha.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    for (const amb of ambientes) {
      const clave = `${amb.id}|${fecha.toISOString().slice(0, 10)}`;
      const tomados = ocupadasPorClave.get(clave) ?? [];
      for (const h of SLOTS) {
        if (tomados.some((t) => seSolapan(t, h))) continue;
        candidatos.push({ dia, ambienteId: amb.id, h });
      }
    }
  }

  // Mezcla determinística para que las reservas queden repartidas
  const random = crearRandom(20260921);
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }

  const totalPedido = RESERVAS_POR_USUARIO.reduce(
    (acc, u) => acc + u.cantidad,
    0,
  );
  if (candidatos.length < totalPedido) {
    throw new Error(
      `Solo hay ${candidatos.length} horarios libres y se piden ${totalPedido}. Ampliá DIA_HASTA o agregá ambientes.`,
    );
  }

  // 6) Crear las reservas
  const usados = new Set<string>();
  let cursor = 0;
  let creadas = 0;
  const resumen: Record<string, number> = {};

  for (const cfg of RESERVAS_POR_USUARIO) {
    const usuario = usuarioPorCorreo.get(cfg.correo);
    if (!usuario) {
      console.warn(`  ⚠ Usuario ${cfg.correo} no existe, se omite`);
      continue;
    }

    let hechas = 0;
    while (hechas < cfg.cantidad && cursor < candidatos.length) {
      const slot = candidatos[cursor++];
      const fecha = fechaRelativa(slot.dia);
      const clave = `${slot.ambienteId}|${fecha.toISOString().slice(0, 10)}|${slot.h[0]}`;
      if (usados.has(clave)) continue;
      usados.add(clave);

      await prisma.reservaAmbiente.create({
        data: {
          ambienteId: slot.ambienteId,
          usuarioId: usuario.id,
          fecha,
          horaIni: hora(slot.h[0]),
          horaFin: hora(slot.h[1]),
          motivo: `${MARCA} ${MOTIVOS[creadas % MOTIVOS.length]}`,
          estadoAulaId: 1,
          estadoAula: EstadoAula.RESERVADO,
        },
      });

      hechas++;
      creadas++;
    }
    resumen[cfg.correo] = hechas;
  }

  console.log(`✔ ${creadas} reservas creadas (a partir de mañana)`);
  for (const [correo, cant] of Object.entries(resumen)) {
    console.log(`  ${correo.padEnd(24)} → ${cant} reservas`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
