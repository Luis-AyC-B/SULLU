/* eslint-disable no-console */
/**
 * Seed ADITIVO HU12. No borra nada y es idempotente.
 * Requiere: seed principal (roles "Personal de control" y "Docente").
 * Ejecutar: npm run seed:hu12
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Test1234!';

const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);
// Bolivia UTC-4
const local = (iso: string, hms: string) => new Date(`${iso}T${hms}-04:00`);

async function permisosIncidencias() {
  const modulo = await prisma.modulo.upsert({
    where: { nombre: 'Incidencias' },
    update: {},
    create: { nombre: 'Incidencias', activo: true },
  });
  const ver = await prisma.permiso.upsert({
    where: { clave: 'incidencias.ver' },
    update: {},
    create: {
      clave: 'incidencias.ver',
      descripcion: 'Ver incidencias de ingreso por examen',
      moduloId: modulo.id,
    },
  });
  const crear = await prisma.permiso.upsert({
    where: { clave: 'incidencias.crear' },
    update: {},
    create: {
      clave: 'incidencias.crear',
      descripcion: 'Registrar incidencias de ingreso',
      moduloId: modulo.id,
    },
  });

  const rolControl = await prisma.rol.findUnique({
    where: { nombre: 'Personal de control' },
  });
  const rolDocente = await prisma.rol.findUnique({
    where: { nombre: 'Docente' },
  });
  if (!rolControl || !rolDocente) {
    throw new Error(
      'Faltan los roles Personal de control / Docente. Corre el seed principal.',
    );
  }

  const asignar = async (rolId: number, permisoId: number) => {
    await prisma.rol_Permiso.upsert({
      where: { rolId_permisoId: { rolId, permisoId } },
      update: {},
      create: { rolId, permisoId },
    });
  };
  const asignarModulo = async (rolId: number) => {
    await prisma.rol_Modulo.upsert({
      where: { rolId_moduloId: { rolId, moduloId: modulo.id } },
      update: {},
      create: { rolId, moduloId: modulo.id },
    });
  };

  // Control: ver + crear. Docente: solo ver.
  await asignar(rolControl.id, ver.id);
  await asignar(rolControl.id, crear.id);
  await asignar(rolDocente.id, ver.id);
  await asignarModulo(rolControl.id);
  await asignarModulo(rolDocente.id);

  return { rolControl, rolDocente };
}

async function usuario(
  correo: string,
  nombre: string,
  apellido: string,
  rolId: number,
) {
  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) {
    await prisma.usuario_Rol.upsert({
      where: { usuarioId_rolId: { usuarioId: existente.id, rolId } },
      update: {},
      create: { usuarioId: existente.id, rolId },
    });
    return existente;
  }
  return prisma.usuario.create({
    data: {
      nombre,
      apellido,
      correo,
      password: await bcrypt.hash(PASSWORD, 10),
      roles: { create: [{ rolId }] },
    },
  });
}

async function estudiante(sis: string, nombre: string, apellido: string) {
  return prisma.estudiante.upsert({
    where: { cod_sis: sis },
    update: {},
    create: { cod_sis: sis, nombre, apellido, ci: sis.slice(-7) },
  });
}

async function main() {
  console.log('\n🌱 Seed HU12...\n');

  const { rolControl, rolDocente } = await permisosIncidencias();

  // ── Usuarios ──
  const carlos = await usuario(
    'c.mendoza@umss.edu.bo',
    'Carlos',
    'Mendoza',
    rolControl.id,
  );
  const docente = await usuario(
    'docente.hu12@umss.edu.bo',
    'Docente',
    'HU12',
    rolDocente.id,
  );

  // ── Estudiantes del padrón de prueba ──
  const padron: [string, string, string][] = [
    ['202104321', 'Sofía', 'Aguilar Céspedes'],
    ['202003456', 'Andrés', 'Villarroel Rocha'],
    ['201905678', 'Camila', 'Méndez García'],
    ['202102345', 'Joaquín', 'Torrico Rojas'],
    ['201900123', 'Ana', 'Rojas Mamani'],
    ['202001456', 'Diego', 'Flores Vargas'],
    ['201902345', 'Valeria', 'López Quispe'],
    ['202103678', 'Mateo', 'Pérez Arce'],
    ['202002789', 'Lucía', 'Salazar Ríos'],
    ['201901567', 'Gabriel', 'Fernández Soto'],
  ];
  const est: Record<string, number> = {};
  for (const [sis, n, a] of padron) est[sis] = (await estudiante(sis, n, a)).id;

  // ── Exámenes (dueño: docente HU12) ──
  const fcyt = await prisma.facultad.findFirstOrThrow({
    where: { nombre: { contains: 'FCyT' } },
  });
  const carrera =
    (await prisma.carrera.findFirst({ where: { facultadId: fcyt.id } })) ??
    (await prisma.carrera.create({
      data: { nombre: 'Ingeniería de Sistemas', facultadId: fcyt.id },
    }));
  const horario =
    (await prisma.horarioFijo.findFirst({
      where: { periodoNombre: 'HU12 mañana' },
    })) ??
    (await prisma.horarioFijo.create({
      data: {
        periodoNombre: 'HU12 mañana',
        horaIni: hora('08:00'),
        horaFin: hora('10:00'),
      },
    }));

  async function examen(
    sigla: string,
    materia: string,
    tipo: string,
    fechaIso: string,
    aula: string,
  ) {
    const amb =
      (await prisma.ambiente.findFirst({
        where: { nombre: aula, facultadId: fcyt.id },
      })) ??
      (await prisma.ambiente.create({
        data: { nombre: aula, capacidad: 60, facultadId: fcyt.id },
      }));
    const mat =
      (await prisma.materia.findFirst({ where: { sigla } })) ??
      (await prisma.materia.create({ data: { sigla, nombre: materia } }));
    await prisma.carrera_Materia.upsert({
      where: {
        carreraId_materiaId: { carreraId: carrera.id, materiaId: mat.id },
      },
      update: {},
      create: { carreraId: carrera.id, materiaId: mat.id },
    });
    const fecha = new Date(`${fechaIso}T00:00:00Z`);
    const reserva =
      (await prisma.reservaAmbiente.findFirst({
        where: { ambienteId: amb.id, horarioFijoId: horario.id, fecha },
      })) ??
      (await prisma.reservaAmbiente.create({
        data: {
          ambienteId: amb.id,
          docenteId: docente.id,
          horarioFijoId: horario.id,
          fecha,
        },
      }));
    const ex =
      (await prisma.examen.findUnique({
        where: { reservaAmbienteId: reserva.id },
      })) ??
      (await prisma.examen.create({
        data: {
          reservaAmbienteId: reserva.id,
          usuarioId: docente.id,
          tipoExamen: tipo,
          estadoExamId: 1,
        },
      }));
    await prisma.examen_Carrera_Materia.upsert({
      where: {
        examenId_carreraId_materiaId: {
          examenId: ex.id,
          carreraId: carrera.id,
          materiaId: mat.id,
        },
      },
      update: {},
      create: { examenId: ex.id, carreraId: carrera.id, materiaId: mat.id },
    });
    // Carlos controla todos los exámenes de prueba
    await prisma.examenControlador.upsert({
      where: {
        examenId_colaboradorId: { examenId: ex.id, colaboradorId: carlos.id },
      },
      update: {},
      create: {
        examenId: ex.id,
        colaboradorId: carlos.id,
        asignadoPor: docente.id,
      },
    });
    return ex;
  }

  const calc = await examen(
    'CALCII',
    'Cálculo II',
    'Examen Final',
    '2026-09-06',
    'Aula 401',
  );
  const fis = await examen(
    'FIS1',
    'Física I',
    'Examen Parcial',
    '2026-09-07',
    'Aula 402',
  );
  const prog = await examen(
    'PROG2',
    'Programación II',
    'Examen Final',
    '2026-09-08',
    'Aula 403',
  );
  void prog; // sin incidencias: prueba el estado vacío

  // ── Incidencias ──
  async function incidencia(
    examenId: number,
    sis: string,
    hms: string,
    fechaIso: string,
    obs?: string,
  ) {
    const fechaHora = local(fechaIso, hms);
    const ya = await prisma.incidenciaIngreso.findFirst({
      where: { examenId, estudianteId: est[sis], fechaHora },
    });
    if (ya) return;
    await prisma.incidenciaIngreso.create({
      data: {
        examenId,
        registradoPor: carlos.id,
        estudianteId: est[sis],
        tipoIncidencia: 'NO_HABILITADO',
        descripcion: obs ?? null,
        fechaHora,
      },
    });
  }

  // Cálculo II: 4 incidencias
  await incidencia(calc.id, '202104321', '09:03:44', '2026-09-06');
  await incidencia(calc.id, '202003456', '09:02:15', '2026-09-06');
  await incidencia(calc.id, '201905678', '09:00:52', '2026-09-06');
  await incidencia(calc.id, '202102345', '08:59:18', '2026-09-06');
  // Física I: una sola (contador en singular)
  await incidencia(
    fis.id,
    '202001456',
    '08:30:10',
    '2026-09-07',
    'Presentó carnet de otra gestión',
  );
  // Programación II: ninguna

  console.log('✅ Seed HU12 completo');
  console.log('   Control : c.mendoza@umss.edu.bo   (incidencias.ver + crear)');
  console.log('   Docente : docente.hu12@umss.edu.bo (incidencias.ver)');
  console.log('   Clave   : ' + PASSWORD);
  console.log(
    '   Cálculo II: 4 incidencias · Física I: 1 · Programación II: 0',
  );
  console.log('   SIS inexistente para pruebas: 123456789');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed HU12:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
