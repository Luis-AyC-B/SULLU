/* eslint-disable no-console */
/**
 * Seed MOCK para probar el módulo de estudiantes.
 * Ubicación: Backend/prisma/seed-mock.ts
 *
 * Ejecutar (después del seed del equipo):
 *   npx prisma db seed && npx ts-node prisma/seed-mock.ts
 *
 * - Reutiliza facultades, carreras, materias y Lab-1 del seed.ts del equipo
 *   (mismos nombres/siglas), y las crea si todavía no existen.
 * - Se puede correr varias veces: borra y recrea solo lo marcado [MOCK-EST].
 * - Las fechas son relativas al día en que lo corras.
 */
import { PrismaClient, EstadoAula, EstadoExamen } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MARCA = '[MOCK-EST]';
const PASSWORD = 'Test1234!';

// Claves que ya existen en el seed.ts del equipo (se reutilizan, no se duplican)
const MODULO = 'Estudiantes';
const PERMISOS = {
  VER: { clave: 'estudiantes.ver', descripcion: 'Ver listado de estudiantes' },
  REGISTRAR: {
    clave: 'estudiantes.registrar',
    descripcion: 'Registrar estudiantes (manual o CSV)',
  },
  HABILITAR: {
    clave: 'estudiantes.habilitar',
    descripcion: 'Habilitar / inhabilitar estudiantes',
  },
} as const;
type PermisoKey = keyof typeof PERMISOS;

// Cada usuario tiene su propio rol con una combinación distinta de permisos
const USUARIOS: {
  correo: string;
  nombre: string;
  apellido: string;
  rol: string;
  permisos: PermisoKey[];
}[] = [
  {
    correo: 'ver@sullu.test',
    nombre: 'Vera',
    apellido: 'SoloVer',
    rol: 'MOCK Estudiantes - Solo ver',
    permisos: ['VER'],
  },
  {
    correo: 'registra@sullu.test',
    nombre: 'Carlos',
    apellido: 'Registra',
    rol: 'MOCK Estudiantes - Ver y registrar (sin habilitar)',
    permisos: ['VER', 'REGISTRAR'],
  },
  {
    correo: 'habilita@sullu.test',
    nombre: 'Elena',
    apellido: 'Habilita',
    rol: 'MOCK Estudiantes - Ver y habilitar (sin registrar)',
    permisos: ['VER', 'HABILITAR'],
  },
  {
    correo: 'completo@sullu.test',
    nombre: 'Camila',
    apellido: 'Completa',
    rol: 'MOCK Estudiantes - Completo',
    permisos: ['VER', 'REGISTRAR', 'HABILITAR'],
  },
  {
    correo: 'sinacceso@sullu.test',
    nombre: 'Nadia',
    apellido: 'SinAcceso',
    rol: 'MOCK Estudiantes - Sin acceso',
    permisos: [],
  },
];

const RESPONSABLE = 'completo@sullu.test'; // responsable de los exámenes y de los ingresos

// Mismos nombres/siglas que el seed.ts del equipo
const FACULTADES = [
  {
    nombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: [
      'Ingeniería de Sistemas',
      'Ingeniería Informática',
      'Ingeniería Civil',
    ],
  },
  {
    nombre: 'Facultad de Ciencias Económicas (FE)',
    carreras: ['Administración de Empresas'],
  },
  { nombre: 'Facultad de Humanidades', carreras: ['Psicología'] },
];

const MATERIAS = [
  {
    sigla: 'BD1',
    nombre: 'Bases de Datos I',
    carreras: ['Ingeniería de Sistemas'],
  },
  {
    sigla: 'INT',
    nombre: 'Introducción a la Programación',
    carreras: ['Ingeniería de Sistemas', 'Ingeniería Informática'],
  },
  {
    sigla: 'CAL1',
    nombre: 'Cálculo I',
    carreras: [
      'Ingeniería de Sistemas',
      'Ingeniería Informática',
      'Ingeniería Civil',
    ],
  },
  {
    sigla: 'CON1',
    nombre: 'Contabilidad Básica',
    carreras: ['Administración de Empresas'],
  },
  { sigla: 'PSG', nombre: 'Psicología General', carreras: ['Psicología'] },
];

// facultad: índice en FACULTADES
const AMBIENTES = [
  { nombre: 'Lab-1', capacidad: 40, tipo: 'Laboratorio', facultad: 0 },
  { nombre: 'Aula 101', capacidad: 60, tipo: 'Aula', facultad: 0 },
  { nombre: 'Aula 102', capacidad: 40, tipo: 'Aula', facultad: 1 },
  { nombre: 'Aula H-1', capacidad: 50, tipo: 'Aula', facultad: 2 },
  {
    nombre: 'Auditorio Central',
    capacidad: 200,
    tipo: 'Auditorio',
    facultad: 0,
  },
];

// dias: relativo a hoy (negativo = ya pasó). h: [hora inicio, hora fin]. amb: índice en AMBIENTES
const EXAMENES: {
  dias: number;
  sigla: string;
  tipo: string;
  estado: EstadoExamen;
  h: [number, number];
  amb: number;
}[] = [
  // Ya pasaron
  {
    dias: -150,
    sigla: 'CAL1',
    tipo: 'Parcial',
    estado: EstadoExamen.FINALIZADO,
    h: [8, 10],
    amb: 1,
  },
  {
    dias: -120,
    sigla: 'INT',
    tipo: 'Parcial',
    estado: EstadoExamen.FINALIZADO,
    h: [14, 16],
    amb: 0,
  },
  {
    dias: -75,
    sigla: 'CON1',
    tipo: 'Final',
    estado: EstadoExamen.FINALIZADO,
    h: [10, 12],
    amb: 2,
  },
  {
    dias: -30,
    sigla: 'BD1',
    tipo: 'Parcial',
    estado: EstadoExamen.FINALIZADO,
    h: [16, 18],
    amb: 0,
  },
  {
    dias: -7,
    sigla: 'PSG',
    tipo: 'Parcial',
    estado: EstadoExamen.FINALIZADO,
    h: [9, 11],
    amb: 3,
  },
  // Hoy
  {
    dias: 0,
    sigla: 'BD1',
    tipo: 'Parcial',
    estado: EstadoExamen.EN_CURSO,
    h: [9, 11],
    amb: 0,
  },
  // Próximos
  {
    dias: 5,
    sigla: 'CAL1',
    tipo: 'Final',
    estado: EstadoExamen.PROGRAMADO,
    h: [8, 10],
    amb: 4,
  },
  {
    dias: 12,
    sigla: 'INT',
    tipo: 'Final',
    estado: EstadoExamen.PROGRAMADO,
    h: [14, 16],
    amb: 0,
  },
  {
    dias: 20,
    sigla: 'BD1',
    tipo: 'Final',
    estado: EstadoExamen.PROGRAMADO,
    h: [10, 12],
    amb: 1,
  },
  {
    dias: 35,
    sigla: 'CON1',
    tipo: 'Segundo turno',
    estado: EstadoExamen.PROGRAMADO,
    h: [16, 18],
    amb: 2,
  },
  {
    dias: 60,
    sigla: 'PSG',
    tipo: 'Final',
    estado: EstadoExamen.PROGRAMADO,
    h: [9, 11],
    amb: 3,
  },
  {
    dias: 85,
    sigla: 'CAL1',
    tipo: 'Segundo turno',
    estado: EstadoExamen.PROGRAMADO,
    h: [15, 17],
    amb: 4,
  },
  // Cancelado (para probar ese estado)
  {
    dias: 10,
    sigla: 'CON1',
    tipo: 'Parcial',
    estado: EstadoExamen.CANCELADO,
    h: [11, 13],
    amb: 2,
  },
];

const NOMBRES = [
  'Juan',
  'María',
  'Luis',
  'Ana',
  'Carlos',
  'Lucía',
  'Diego',
  'Valeria',
  'Andrés',
  'Camila',
  'Pedro',
  'Sofía',
  'Jorge',
  'Daniela',
  'Miguel',
  'Paola',
  'Fernando',
  'Gabriela',
  'Ricardo',
  'Alejandra',
];
const APELLIDOS = [
  'Quispe',
  'Mamani',
  'Flores',
  'Rojas',
  'Vargas',
  'Choque',
  'Gutiérrez',
  'Mendoza',
  'Cruz',
  'Torrico',
  'Rivera',
  'Salvatierra',
  'Arce',
  'Camacho',
  'Suárez',
  'Ballivián',
];
const MOTIVOS = [
  'Deuda pendiente',
  'Documentación incompleta',
  'Suspensión académica',
  'Materia no habilitada en su plan',
];
const TOTAL_ESTUDIANTES = 60;
const INSCRITOS_POR_EXAMEN = 30;

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

async function main() {
  console.log('Iniciando seed mock de estudiantes...');

  // 1) Limpieza de corridas anteriores (solo lo marcado como mock)
  const viejos = await prisma.examen.findMany({
    where: { normasEx: { startsWith: MARCA } },
    select: { id: true },
  });
  const viejosIds = viejos.map((e) => e.id);
  await prisma.ingreso.deleteMany({ where: { examenId: { in: viejosIds } } });
  await prisma.examen.deleteMany({ where: { id: { in: viejosIds } } });
  await prisma.reservaAmbiente.deleteMany({
    where: { motivo: { startsWith: MARCA } },
  });

  // 2) Facultades, carreras y materias (reutiliza las del seed del equipo)
  const facultadIds: number[] = [];
  const carreraIds: Record<string, number> = {};
  for (const f of FACULTADES) {
    const facultad = await prisma.facultad.upsert({
      where: { nombre: f.nombre },
      update: {},
      create: { nombre: f.nombre },
    });
    facultadIds.push(facultad.id);

    for (const nombre of f.carreras) {
      const existente = await prisma.carrera.findFirst({ where: { nombre } });
      const carrera =
        existente ??
        (await prisma.carrera.create({
          data: { nombre, facultadId: facultad.id },
        }));
      carreraIds[nombre] = carrera.id;
    }
  }

  // sigla -> materia y todas las carreras donde se dicta
  const materiaInfo: Record<
    string,
    { materiaId: number; carreraIds: number[] }
  > = {};
  for (const m of MATERIAS) {
    const existente = await prisma.materia.findFirst({
      where: { sigla: m.sigla },
    });
    const materia =
      existente ??
      (await prisma.materia.create({
        data: { sigla: m.sigla, nombre: m.nombre },
      }));

    for (const nombreCarrera of m.carreras) {
      await prisma.carrera_Materia.upsert({
        where: {
          carreraId_materiaId: {
            carreraId: carreraIds[nombreCarrera],
            materiaId: materia.id,
          },
        },
        update: {},
        create: { carreraId: carreraIds[nombreCarrera], materiaId: materia.id },
      });
    }
    materiaInfo[m.sigla] = {
      materiaId: materia.id,
      carreraIds: m.carreras.map((c) => carreraIds[c]),
    };
  }

  // 3) Módulo, permisos, roles y usuarios
  const modulo = await prisma.modulo.upsert({
    where: { nombre: MODULO },
    update: {},
    create: { nombre: MODULO },
  });

  const permisoIds = {} as Record<PermisoKey, number>;
  for (const key of Object.keys(PERMISOS) as PermisoKey[]) {
    const p = PERMISOS[key];
    const permiso = await prisma.permiso.upsert({
      where: { clave: p.clave },
      update: {},
      create: {
        moduloId: modulo.id,
        clave: p.clave,
        descripcion: p.descripcion,
      },
    });
    permisoIds[key] = permiso.id;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const usuarioIds: Record<string, number> = {};

  for (const u of USUARIOS) {
    const rol = await prisma.rol.upsert({
      where: { nombre: u.rol },
      update: {},
      create: { nombre: u.rol, descripcion: `${MARCA} Combinación de prueba` },
    });

    // Reinicia los permisos del rol para que coincidan con lo definido arriba
    await prisma.rol_Permiso.deleteMany({ where: { rolId: rol.id } });
    await prisma.rol_Modulo.deleteMany({ where: { rolId: rol.id } });
    if (u.permisos.length > 0) {
      await prisma.rol_Permiso.createMany({
        data: u.permisos.map((k) => ({
          rolId: rol.id,
          permisoId: permisoIds[k],
        })),
        skipDuplicates: true,
      });
      // El módulo solo aparece para roles que tengan al menos un permiso
      await prisma.rol_Modulo.create({
        data: { rolId: rol.id, moduloId: modulo.id },
      });
    }

    const usuario = await prisma.usuario.upsert({
      where: { correo: u.correo },
      update: { password: passwordHash },
      create: {
        nombre: u.nombre,
        apellido: u.apellido,
        correo: u.correo,
        password: passwordHash,
      },
    });
    usuarioIds[u.correo] = usuario.id;

    await prisma.usuario_Rol.deleteMany({ where: { usuarioId: usuario.id } });
    await prisma.usuario_Rol.create({
      data: { usuarioId: usuario.id, rolId: rol.id },
    });

    // Alcance sobre todas las facultades, para que vean exámenes de cualquiera
    await prisma.usuario_Alcance.deleteMany({
      where: { usuarioId: usuario.id },
    });
    await prisma.usuario_Alcance.createMany({
      data: facultadIds.map((facultadId) => ({
        usuarioId: usuario.id,
        facultadId,
      })),
    });
  }

  // 4) Ambientes
  const ambienteIds: number[] = [];
  for (const a of AMBIENTES) {
    const tipoExistente = await prisma.tipoAula.findFirst({
      where: { nombre: a.tipo },
    });
    const tipo =
      tipoExistente ??
      (await prisma.tipoAula.create({ data: { nombre: a.tipo } }));

    const existente = await prisma.ambiente.findFirst({
      where: { nombre: a.nombre },
    });
    const ambiente =
      existente ??
      (await prisma.ambiente.create({
        data: {
          nombre: a.nombre,
          capacidad: a.capacidad,
          facultadId: facultadIds[a.facultad],
          tipoAulaId: tipo.id,
          estadoAulaId: 1,
          estadoAula: EstadoAula.DISPONIBLE,
        },
      }));
    ambienteIds.push(ambiente.id);
  }

  // 5) Estudiantes (con una carga CSV simulada) y sus códigos QR
  const carga =
    (await prisma.cargaEstudiantes.findFirst({
      where: { archivoNombre: 'mock_estudiantes.csv' },
    })) ??
    (await prisma.cargaEstudiantes.create({
      data: {
        archivoNombre: 'mock_estudiantes.csv',
        fechaCarga: new Date(),
        cargadoPor: usuarioIds[RESPONSABLE],
        cantidadRegistros: TOTAL_ESTUDIANTES,
      },
    }));

  const codigos = Array.from(
    { length: TOTAL_ESTUDIANTES },
    (_, i) => `2026${String(i + 1).padStart(5, '0')}`,
  );
  await prisma.estudiante.createMany({
    data: codigos.map((cod, i) => ({
      cod_sis: cod,
      nombre: NOMBRES[i % NOMBRES.length],
      apellido: `${APELLIDOS[i % APELLIDOS.length]} ${APELLIDOS[(i * 3 + 1) % APELLIDOS.length]}`,
      ci: String(9000000 + i * 137),
      cargaId: carga.id,
    })),
    skipDuplicates: true,
  });
  const estudiantes = await prisma.estudiante.findMany({
    where: { cod_sis: { in: codigos } },
    orderBy: { cod_sis: 'asc' },
  });

  await prisma.codigoQr.createMany({
    data: estudiantes.map((e) => ({
      estudianteId: e.id,
      token: `QR-MOCK-${e.cod_sis}`,
      generadoEn: new Date(),
      expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })),
    skipDuplicates: true,
  });

  // 6) Exámenes: reserva + examen + carreras/materia + inscritos (+ ingresos si ya empezó)
  for (let k = 0; k < EXAMENES.length; k++) {
    const e = EXAMENES[k];
    const info = materiaInfo[e.sigla];

    const reserva = await prisma.reservaAmbiente.create({
      data: {
        ambienteId: ambienteIds[e.amb],
        usuarioId: usuarioIds[RESPONSABLE],
        fecha: fechaRelativa(e.dias),
        horaIni: hora(e.h[0]),
        horaFin: hora(e.h[1]),
        motivo: `${MARCA} ${e.tipo} ${e.sigla}`,
        estadoAulaId: 1,
      },
    });

    const examen = await prisma.examen.create({
      data: {
        reservaAmbienteId: reserva.id,
        usuarioId: usuarioIds[RESPONSABLE],
        tipoExamen: e.tipo,
        normasEx: `${MARCA} Traer CI y celular con el QR. No se permite calculadora programable.`,
        estado: e.estado,
        estadoExamId: 1, // campo obligatorio en tu schema (el seed original también lo usa)
        carrerasMaterias: {
          create: info.carreraIds.map((carreraId) => ({
            carreraId,
            materiaId: info.materiaId,
          })),
        },
      },
    });

    // Cada examen inscribe a 30 estudiantes distintos; 1 de cada 6 queda inhabilitado
    const inscritos = Array.from({ length: INSCRITOS_POR_EXAMEN }, (_, j) => ({
      est: estudiantes[(k * 7 + j) % estudiantes.length],
      habilitado: j % 6 !== 5,
      motivo: MOTIVOS[(k + j) % MOTIVOS.length],
    }));
    await prisma.examen_Estudiante.createMany({
      data: inscritos.map((i) => ({
        estudianteId: i.est.id,
        examenId: examen.id,
        estado_habilitado: i.habilitado,
        motivo_inhabilitacion: i.habilitado ? null : i.motivo,
      })),
      skipDuplicates: true,
    });

    // Exámenes ya rendidos o en curso: ingresan los habilitados, salvo 1 de cada 4 (ausentes)
    if (
      e.estado === EstadoExamen.FINALIZADO ||
      e.estado === EstadoExamen.EN_CURSO
    ) {
      const inicio = fechaRelativa(e.dias).getTime() + e.h[0] * 60 * 60 * 1000;
      const ingresos = inscritos
        .filter((i) => i.habilitado)
        .filter((_, j) => j % 4 !== 3)
        .map((i, j) => ({
          estudianteId: i.est.id,
          examenId: examen.id,
          fechaHora: new Date(inicio + (5 + j) * 60 * 1000),
          metodo: j % 5 === 4 ? 'Manual' : 'Escaneo QR',
          registradoPor: usuarioIds[RESPONSABLE],
        }));
      await prisma.ingreso.createMany({ data: ingresos });
    }
  }

  console.log(
    `✔ ${EXAMENES.length} exámenes, ${estudiantes.length} estudiantes, ${USUARIOS.length} usuarios`,
  );
  console.log(`Contraseña de todos los usuarios de prueba: ${PASSWORD}`);
  for (const u of USUARIOS) {
    console.log(
      `  ${u.correo.padEnd(24)} → ${u.permisos.join(', ') || '(sin permisos)'}`,
    );
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
