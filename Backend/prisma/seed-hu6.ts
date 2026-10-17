/* eslint-disable no-console */
/**
 * Seed ADITIVO para HU6. No borra nada y es idempotente.
 * Ejecutar: npm run seed:hu6
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Las columnas TIME se guardan como fecha 1970-01-01 en UTC
const hora = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00Z`);
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);

async function asegurarHorario(nombre: string, ini: string, fin: string) {
  const existente = await prisma.horarioFijo.findFirst({
    where: { periodoNombre: nombre },
  });
  if (existente) return existente;
  return prisma.horarioFijo.create({
    data: { periodoNombre: nombre, horaIni: hora(ini), horaFin: hora(fin) },
  });
}

async function asegurarEstudiante(
  cod_sis: string,
  ci: string,
  nombre: string,
  apellido: string,
  rolId: number,
) {
  const existente = await prisma.estudiante.findUnique({ where: { cod_sis } });
  if (existente) return existente;

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      correo: null, // los estudiantes no necesitan correo
      password: await bcrypt.hash(ci, 10), // el hash del CI, nunca el CI
      roles: { create: [{ rolId }] },
    },
  });
  return prisma.estudiante.create({
    data: { cod_sis, nombre, apellido, ci, usuarioId: usuario.id },
  });
}

async function asegurarAmbiente(nombre: string, facultadId: number) {
  const existente = await prisma.ambiente.findFirst({
    where: { nombre, facultadId },
  });
  if (existente) return existente;
  return prisma.ambiente.create({
    data: { nombre, capacidad: 40, facultadId },
  });
}

async function asegurarCarreraMateria(
  facultadId: number,
  carreraNombre: string,
  sigla: string,
  materiaNombre: string,
) {
  const carrera =
    (await prisma.carrera.findFirst({
      where: { nombre: carreraNombre, facultadId },
    })) ??
    (await prisma.carrera.create({
      data: { nombre: carreraNombre, facultadId },
    }));
  const materia =
    (await prisma.materia.findFirst({ where: { sigla } })) ??
    (await prisma.materia.create({ data: { sigla, nombre: materiaNombre } }));
  await prisma.carrera_Materia.upsert({
    where: {
      carreraId_materiaId: { carreraId: carrera.id, materiaId: materia.id },
    },
    update: {},
    create: { carreraId: carrera.id, materiaId: materia.id },
  });
  return { carreraId: carrera.id, materiaId: materia.id };
}

async function asegurarExamen(p: {
  ambienteId: number;
  docenteId: number;
  horarioFijoId: number;
  fechaIso: string;
  tipoExamen: string;
  carreraId: number;
  materiaId: number;
}) {
  const fecha = dia(p.fechaIso);
  const reserva =
    (await prisma.reservaAmbiente.findFirst({
      where: {
        ambienteId: p.ambienteId,
        horarioFijoId: p.horarioFijoId,
        fecha,
      },
    })) ??
    (await prisma.reservaAmbiente.create({
      data: {
        ambienteId: p.ambienteId,
        docenteId: p.docenteId,
        horarioFijoId: p.horarioFijoId,
        fecha,
      },
    }));

  const examen =
    (await prisma.examen.findUnique({
      where: { reservaAmbienteId: reserva.id },
    })) ??
    (await prisma.examen.create({
      data: {
        reservaAmbienteId: reserva.id,
        usuarioId: p.docenteId,
        tipoExamen: p.tipoExamen,
        estadoExamId: 1,
      },
    }));

  await prisma.examen_Carrera_Materia.upsert({
    where: {
      examenId_carreraId_materiaId: {
        examenId: examen.id,
        carreraId: p.carreraId,
        materiaId: p.materiaId,
      },
    },
    update: {},
    create: {
      examenId: examen.id,
      carreraId: p.carreraId,
      materiaId: p.materiaId,
    },
  });
  return examen;
}

async function habilitar(
  estudianteId: number,
  examenId: number,
  habilitado: boolean,
) {
  await prisma.examen_Estudiante.upsert({
    where: { estudianteId_examenId: { estudianteId, examenId } },
    update: { estado_habilitado: habilitado },
    create: {
      estudianteId,
      examenId,
      estado_habilitado: habilitado,
      motivo_inhabilitacion: habilitado
        ? null
        : 'Inhabilitado (dato de prueba)',
    },
  });
}

async function main() {
  console.log('\n🌱 Seed HU6 (aditivo)...\n');

  // 1. Rol Estudiante
  const rolEstudiante = await prisma.rol.upsert({
    where: { nombre: 'Estudiante' },
    update: {},
    create: {
      nombre: 'Estudiante',
      descripcion: 'Estudiante habilitado en exámenes (login con SIS + CI)',
    },
  });

  // 2. Periodos que muestra el front
  const h0900 = await asegurarHorario('HU6 09:00-11:00', '09:00', '11:00');
  const h1400 = await asegurarHorario('HU6 14:00-16:00', '14:00', '16:00');
  const h0800 = await asegurarHorario('HU6 08:00-10:00', '08:00', '10:00');

  // 3. Estudiantes de prueba
  const ana = await asegurarEstudiante(
    '201900123',
    '8123456',
    'Ana',
    'Rojas Mamani',
    rolEstudiante.id,
  );
  await asegurarEstudiante(
    '201900124',
    '9234567',
    'Luis',
    'Quispe Vargas',
    rolEstudiante.id,
  );
  const marta = await asegurarEstudiante(
    '201900125',
    '7345678',
    'Marta',
    'Flores Rojas',
    rolEstudiante.id,
  );

  // 4. Docente responsable de los exámenes de prueba
  const docente = await prisma.usuario.upsert({
    where: { correo: 'docente.hu6@umss.edu.bo' },
    update: {},
    create: {
      nombre: 'Docente',
      apellido: 'HU6',
      correo: 'docente.hu6@umss.edu.bo',
      password: await bcrypt.hash('Test1234!', 10),
    },
  });

  // 5. Facultades y ambientes (mismo nombre que usa el seed principal)
  const fcyt = await prisma.facultad.upsert({
    where: { nombre: 'Facultad de Ciencias y Tecnología (FCyT)' },
    update: {},
    create: { nombre: 'Facultad de Ciencias y Tecnología (FCyT)' },
  });
  const fce = await prisma.facultad.upsert({
    where: { nombre: 'Facultad de Ciencias Económicas (FCE)' },
    update: {},
    create: { nombre: 'Facultad de Ciencias Económicas (FCE)' },
  });
  const aula203 = await asegurarAmbiente('Aula 203', fcyt.id);
  const lab2 = await asegurarAmbiente('Laboratorio Informática 2', fcyt.id);
  const aula101 = await asegurarAmbiente('Aula 101', fce.id);

  // 6. Materias y exámenes de Ana
  const calc = await asegurarCarreraMateria(
    fcyt.id,
    'Ingeniería de Sistemas',
    'CALCII',
    'Cálculo II',
  );
  const redes = await asegurarCarreraMateria(
    fcyt.id,
    'Ingeniería de Sistemas',
    'REDES',
    'Redes de Computadoras',
  );
  const adm = await asegurarCarreraMateria(
    fce.id,
    'Administración de Empresas',
    'ADM2',
    'Administración II',
  );

  const exCalc = await asegurarExamen({
    ambienteId: aula203.id,
    docenteId: docente.id,
    horarioFijoId: h0900.id,
    fechaIso: '2026-09-06',
    tipoExamen: 'Examen Final',
    ...calc,
  });
  const exRedes = await asegurarExamen({
    ambienteId: lab2.id,
    docenteId: docente.id,
    horarioFijoId: h1400.id,
    fechaIso: '2026-09-10',
    tipoExamen: 'Primer parcial',
    ...redes,
  });
  const exAdm = await asegurarExamen({
    ambienteId: aula101.id,
    docenteId: docente.id,
    horarioFijoId: h0800.id,
    fechaIso: '2026-09-14',
    tipoExamen: 'Examen final',
    ...adm,
  });

  // 7. Habilitaciones
  await habilitar(ana.id, exCalc.id, true);
  await habilitar(ana.id, exRedes.id, true);
  await habilitar(ana.id, exAdm.id, true);
  // Marta: inhabilitada en Cálculo II, sirve para probar el estado "Inhabilitado"
  await habilitar(marta.id, exCalc.id, false);
  // Luis: sin ninguna habilitación (lista vacía)

  console.log('✅ Seed HU6 completo');
  console.log('   Ana   201900123 / 8123456 → 3 exámenes habilitados');
  console.log('   Luis  201900124 / 9234567 → sin exámenes');
  console.log('   Marta 201900125 / 7345678 → inhabilitada en Cálculo II');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed HU6:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
