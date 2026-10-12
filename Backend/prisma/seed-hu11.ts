/* eslint-disable no-console */
/**
 * Seed ADITIVO HU11. No borra nada y es idempotente.
 * Requiere: seed principal (j.perez@umss.edu.bo, rol "Personal de control")
 *           y seed:hu6 (examen de Cálculo II del 2026-09-06).
 * Ejecutar: npm run seed:hu11
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);
// Bolivia UTC-4: 09:04:32 local = 13:04:32Z
const local = (iso: string, hms: string) => new Date(`${iso}T${hms}-04:00`);

async function permisoIngresos() {
  const modulo = await prisma.modulo.upsert({
    where: { nombre: 'Control de ingreso' },
    update: {},
    create: { nombre: 'Control de ingreso', activo: true },
  });
  const permiso = await prisma.permiso.upsert({
    where: { clave: 'control_ingreso.ver_ingresos' },
    update: {},
    create: {
      clave: 'control_ingreso.ver_ingresos',
      descripcion: 'Ver registro de ingresos por examen (Control)',
      moduloId: modulo.id,
    },
  });
  const rol = await prisma.rol.findUnique({
    where: { nombre: 'Personal de control' },
  });
  if (!rol) {
    throw new Error('No existe el rol Personal de control. Corre el seed principal.');
  }
  await prisma.rol_Permiso.upsert({
    where: { rolId_permisoId: { rolId: rol.id, permisoId: permiso.id } },
    update: {},
    create: { rolId: rol.id, permisoId: permiso.id },
  });
}

async function estudiante(sis: string, nombre: string, apellido: string) {
  return prisma.estudiante.upsert({
    where: { cod_sis: sis },
    update: {},
    create: { cod_sis: sis, nombre, apellido, ci: sis.slice(-7) },
  });
}

async function habilitar(estudianteId: number, examenId: number) {
  await prisma.examen_Estudiante.upsert({
    where: { estudianteId_examenId: { estudianteId, examenId } },
    update: {},
    create: { estudianteId, examenId, estado_habilitado: true },
  });
}

async function ingresar(
  estudianteId: number,
  examenId: number,
  fecha: Date,
  metodo: string,
  registradoPor: number,
) {
  const ya = await prisma.ingreso.findFirst({
    where: { estudianteId, examenId },
  });
  if (!ya) {
    await prisma.ingreso.create({
      data: { estudianteId, examenId, fechaHora: fecha, metodo, registradoPor },
    });
  }
}

async function main() {
  console.log('\n🌱 Seed HU11...\n');

  await permisoIngresos();

  const control = await prisma.usuario.findUnique({
    where: { correo: 'j.perez@umss.edu.bo' },
  });
  if (!control) {
    throw new Error('Falta j.perez@umss.edu.bo (seed principal).');
  }
  const controlId = control.id;

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

  // ── Cálculo II (lo crea seed:hu6) ──
  const calc = await prisma.examen.findFirst({
    where: {
      reservaAmbiente: { fecha: new Date('2026-09-06T00:00:00Z') },
      carrerasMaterias: {
        some: { carrera_materia: { materia: { sigla: 'CALCII' } } },
      },
    },
  });
  if (!calc) {
    throw new Error('No hay examen de Cálculo II. Corre npm run seed:hu6.');
  }

  // Los 6 ingresos más recientes del mockup
  const recientes: [string, string, string, string, string][] = [
    ['201900123', 'Ana', 'Rojas Mamani', '09:04:32', 'QR'],
    ['202001456', 'Diego', 'Flores Vargas', '09:03:57', 'QR'],
    ['201902345', 'Valeria', 'López Quispe', '09:03:21', 'Manual'],
    ['202103678', 'Mateo', 'Pérez Arce', '09:02:48', 'QR'],
    ['202002789', 'Lucía', 'Salazar Ríos', '09:02:06', 'QR'],
    ['201901567', 'Gabriel', 'Fernández Soto', '09:01:39', 'Manual'],
  ];
  for (const [sis, n, a, hms, metodo] of recientes) {
    const e = await estudiante(sis, n, a);
    await habilitar(e.id, calc.id);
    await ingresar(e.id, calc.id, local('2026-09-06', hms), metodo, controlId);
  }

  // Relleno hasta 85 registrados y 42 ingresados (6 + 36)
  const totalActual = await prisma.examen_Estudiante.count({
    where: { examenId: calc.id },
  });
  for (let i = 1; i <= 85 - totalActual; i++) {
    const e = await estudiante(
      `2026${String(i).padStart(5, '0')}`,
      `Estudiante${i}`,
      'Prueba',
    );
    await habilitar(e.id, calc.id);
    if (i <= 36) {
      const mm = String(10 + i).padStart(2, '0'); // 08:11 ... 08:46
      await ingresar(e.id, calc.id, local('2026-09-06', `08:${mm}:00`), 'QR', controlId);
    }
  }

  // ── Física I (2 de 60) y Programación II (0 de 40) ──
  const fcyt = await prisma.facultad.findFirstOrThrow({
    where: { nombre: { contains: 'FCyT' } },
  });
  const hor =
    (await prisma.horarioFijo.findFirst({
      where: { periodoNombre: 'HU11 tarde' },
    })) ??
    (await prisma.horarioFijo.create({
      data: {
        periodoNombre: 'HU11 tarde',
        horaIni: hora('16:00'),
        horaFin: hora('18:00'),
      },
    }));

  async function examenExtra(
    sigla: string,
    materia: string,
    fechaIso: string,
    aula: string,
    total: number,
    ingresados: number,
    prefijo: string,
  ) {
    const amb =
      (await prisma.ambiente.findFirst({
        where: { nombre: aula, facultadId: fcyt.id },
      })) ??
      (await prisma.ambiente.create({
        data: { nombre: aula, capacidad: 60, facultadId: fcyt.id },
      }));
    const carrera =
      (await prisma.carrera.findFirst({ where: { facultadId: fcyt.id } })) ??
      (await prisma.carrera.create({
        data: { nombre: 'Ingeniería de Sistemas', facultadId: fcyt.id },
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
        where: { ambienteId: amb.id, horarioFijoId: hor.id, fecha },
      })) ??
      (await prisma.reservaAmbiente.create({
        data: {
          ambienteId: amb.id,
          docenteId: docente.id,
          horarioFijoId: hor.id,
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
          tipoExamen: 'Examen Parcial',
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

    const actual = await prisma.examen_Estudiante.count({
      where: { examenId: ex.id },
    });
    for (let i = 1; i <= total - actual; i++) {
      const e = await estudiante(
        `${prefijo}${String(i).padStart(5, '0')}`,
        `Est${sigla}${i}`,
        'Prueba',
      );
      await habilitar(e.id, ex.id);
      if (i <= ingresados) {
        await ingresar(
          e.id,
          ex.id,
          local(fechaIso, `08:${String(10 + i).padStart(2, '0')}:00`),
          'QR',
          controlId,
        );
      }
    }
    return ex;
  }

  const fis = await examenExtra('FIS1', 'Física I', '2026-09-07', 'Aula 301', 60, 2, '2027');
  const prog = await examenExtra('PROG2', 'Programación II', '2026-09-08', 'Aula 302', 40, 0, '2028');

  // ── Asignar los 3 exámenes al usuario de control ──
  for (const ex of [calc, fis, prog]) {
    await prisma.examenControlador.upsert({
      where: {
        examenId_colaboradorId: { examenId: ex.id, colaboradorId: controlId },
      },
      update: {},
      create: {
        examenId: ex.id,
        colaboradorId: controlId,
        asignadoPor: docente.id,
      },
    });
  }

  console.log('✅ Seed HU11 completo');
  console.log('   Cálculo II 42/85, Física I 2/60, Programación II 0/40');
  console.log('   Control: j.perez@umss.edu.bo');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed HU11:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });