/* eslint-disable no-console */
import {
  PrismaClient,
  EstadoAula,
  EstadoExamen,
  Estudiante,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando poblado de datos (seeding)...');

  // ==========================================
  // 1. MÓDULOS Y PERMISOS BASE
  // ==========================================
  const modulosNombres = ['Usuarios', 'Roles', 'Estudiantes', 'Exámenes'];
  for (const nombre of modulosNombres) {
    await prisma.modulo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const permisosBase = [
    {
      clave: 'usuarios.ver',
      modulo: 'Usuarios',
    },
    {
      clave: 'usuarios.crear',
      modulo: 'Usuarios',
    },
    {
      clave: 'usuarios.editar',
      modulo: 'Usuarios',
    },
    {
      clave: 'usuarios.desactivar',
      modulo: 'Usuarios',
    },
    {
      clave: 'roles.ver',
      modulo: 'Roles',
    },
    {
      clave: 'roles.crear',
      modulo: 'Roles',
    },
    {
      clave: 'roles.editar',
      modulo: 'Roles',
    },
    {
      clave: 'roles.eliminar',
      modulo: 'Roles',
    },
    {
      clave: 'estudiantes.ver',
      modulo: 'Estudiantes',
    },
    {
      clave: 'estudiantes.registrar',
      modulo: 'Estudiantes',
    },
    {
      clave: 'estudiantes.habilitar',
      modulo: 'Estudiantes',
    },
    {
      clave: 'examenes.ver',
      modulo: 'Exámenes',
    },
    {
      clave: 'examenes.crear',
      modulo: 'Exámenes',
    },
    {
      clave: 'examenes.editar',
      modulo: 'Exámenes',
    },
    {
      clave: 'examenes.eliminar',
      modulo: 'Exámenes',
    },
  ];

  for (const p of permisosBase) {
    await prisma.permiso.upsert({
      where: { clave: p.clave },
      update: {},
      create: {
        clave: p.clave,
        modulo: { connect: { nombre: p.modulo } },
      },
    });
  }

  const todosLosPermisos = await prisma.permiso.findMany();
  const todosLosModulos = await prisma.modulo.findMany();

  // ==========================================
  // 2. ROLES (PLANTILLAS) Y ROL_MODULO
  // ==========================================
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {
      esPlantilla: true,
      permisos: {
        deleteMany: {},
        create: todosLosPermisos.map((p) => ({ permisoId: p.id })),
      },
    },
    create: {
      nombre: 'Administrador',
      esPlantilla: true,
      permisos: {
        create: todosLosPermisos.map((p) => ({ permisoId: p.id })),
      },
    },
  });

  const rolDocente = await prisma.rol.upsert({
    where: { nombre: 'Docente' },
    update: {
      esPlantilla: true,
      permisos: {
        deleteMany: {},
        create: todosLosPermisos
          .filter(
            (p) =>
              p.clave.startsWith('estudiantes') ||
              p.clave.startsWith('examenes'),
          )
          .map((p) => ({ permisoId: p.id })),
      },
    },
    create: {
      nombre: 'Docente',
      esPlantilla: true,
      permisos: {
        create: todosLosPermisos
          .filter(
            (p) =>
              p.clave.startsWith('estudiantes') ||
              p.clave.startsWith('examenes'),
          )
          .map((p) => ({ permisoId: p.id })),
      },
    },
  });

  const rolGuardia = await prisma.rol.upsert({
    where: { nombre: 'Personal de control de ingreso' },
    update: {
      esPlantilla: true,
      permisos: {
        deleteMany: {},
        create: todosLosPermisos
          .filter((p) => p.clave.includes('habilitar'))
          .map((p) => ({ permisoId: p.id })),
      },
    },
    create: {
      nombre: 'Personal de control de ingreso',
      esPlantilla: true,
      permisos: {
        create: todosLosPermisos
          .filter((p) => p.clave.includes('habilitar'))
          .map((p) => ({ permisoId: p.id })),
      },
    },
  });

  // Llenar tabla Rol_Modulo
  for (const modulo of todosLosModulos) {
    await prisma.rol_Modulo.upsert({
      where: {
        rolId_moduloId: { rolId: rolAdmin.id, moduloId: modulo.id },
      },
      update: {},
      create: { rolId: rolAdmin.id, moduloId: modulo.id },
    });
  }

  // ==========================================
  // 3. DATOS DE PRUEBA ACADÉMICOS Y AMBIENTES
  // ==========================================
  const fcyt = await prisma.facultad.upsert({
    where: { nombre: 'Facultad de Ciencias y Tecnología (FCyT)' },
    update: {},
    create: { nombre: 'Facultad de Ciencias y Tecnología (FCyT)' },
  });

  let carSistemas = await prisma.carrera.findFirst({
    where: { nombre: 'Ingeniería de Sistemas' },
  });
  if (!carSistemas) {
    carSistemas = await prisma.carrera.create({
      data: { nombre: 'Ingeniería de Sistemas', facultadId: fcyt.id },
    });
  }

  let materiaBD1 = await prisma.materia.findFirst({
    where: { sigla: 'BD1' },
  });
  if (!materiaBD1) {
    materiaBD1 = await prisma.materia.create({
      data: { nombre: 'Bases de Datos I', sigla: 'BD1' },
    });
  }

  await prisma.carrera_Materia.upsert({
    where: {
      carreraId_materiaId: {
        carreraId: carSistemas.id,
        materiaId: materiaBD1.id,
      },
    },
    update: {},
    create: { carreraId: carSistemas.id, materiaId: materiaBD1.id },
  });

  let tipoLaboratorio = await prisma.tipoAula.findFirst({
    where: { nombre: 'Laboratorio' },
  });
  if (!tipoLaboratorio) {
    tipoLaboratorio = await prisma.tipoAula.create({
      data: { nombre: 'Laboratorio' },
    });
  }

  let aulaLab = await prisma.ambiente.findFirst({
    where: { nombre: 'Lab-1' },
  });
  if (!aulaLab) {
    aulaLab = await prisma.ambiente.create({
      data: {
        nombre: 'Lab-1',
        capacidad: 40,
        facultadId: fcyt.id,
        tipoAulaId: tipoLaboratorio.id,
        estadoAulaId: 1,
        estadoAula: EstadoAula.DISPONIBLE,
      },
    });
  }

  // ==========================================
  // 4. USUARIOS, ALCANCES Y CARGAS
  // ==========================================
  const defaultPass = await bcrypt.hash('password123', 10);

  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@exacontrol.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Sistema',
      correo: 'admin@exacontrol.com',
      password: defaultPass,
      roles: { create: { rolId: rolAdmin.id } },
    },
  });

  const docenteJuan = await prisma.usuario.upsert({
    where: { correo: 'juan.perez@docente.umss.edu' },
    update: {},
    create: {
      nombre: 'Juan',
      apellido: 'Pérez',
      correo: 'juan.perez@docente.umss.edu',
      password: defaultPass,
      roles: { create: { rolId: rolDocente.id } },
    },
  });

  const guardiaTapia = await prisma.usuario.upsert({
    where: { correo: 'control@exacontrol.com' },
    update: {},
    create: {
      nombre: 'Luis',
      apellido: 'Tapia',
      correo: 'control@exacontrol.com',
      password: defaultPass,
      roles: { create: { rolId: rolGuardia.id } },
    },
  });

  const alcanceExiste = await prisma.usuario_Alcance.findFirst({
    where: { usuarioId: docenteJuan.id, carreraId: carSistemas.id },
  });
  if (!alcanceExiste) {
    await prisma.usuario_Alcance.create({
      data: {
        usuarioId: docenteJuan.id,
        facultadId: fcyt.id,
        carreraId: carSistemas.id,
        materiaId: materiaBD1.id,
      },
    });
  }

  let cargaPrueba = await prisma.cargaEstudiantes.findFirst({
    where: { archivoNombre: 'lista_inscritos_2026.csv' },
  });
  if (!cargaPrueba) {
    cargaPrueba = await prisma.cargaEstudiantes.create({
      data: {
        archivoNombre: 'lista_inscritos_2026.csv',
        fechaCarga: new Date(),
        cargadoPor: admin.id,
        cantidadRegistros: 3,
      },
    });
  }

  // ==========================================
  // 5. ESTUDIANTES Y CÓDIGOS QR
  // ==========================================
  const estudiantesData = [
    {
      cod_sis: '202012345',
      nombre: 'Ana',
      apellido: 'Vargas',
      ci: '1122334',
    },
    {
      cod_sis: '202154321',
      nombre: 'Roberto',
      apellido: 'López',
      ci: '2233445',
    },
    {
      cod_sis: '202298765',
      nombre: 'Carla',
      apellido: 'Rojas',
      ci: '3344556',
    },
  ];

  // AQUI DECLARAMOS EL ARREGLO COMO any[] PARA QUE TYPESCRIPT NO LLORE
  const estudiantesGuardados: Estudiante[] = [];

  for (const est of estudiantesData) {
    const estudianteGuardado = await prisma.estudiante.upsert({
      where: { cod_sis: est.cod_sis },
      update: { cargaId: cargaPrueba.id },
      create: {
        cod_sis: est.cod_sis,
        nombre: est.nombre,
        apellido: est.apellido,
        ci: est.ci,
        cargaId: cargaPrueba.id,
      },
    });
    estudiantesGuardados.push(estudianteGuardado);

    const qrExiste = await prisma.codigoQr.findFirst({
      where: { estudianteId: estudianteGuardado.id },
    });
    if (!qrExiste) {
      await prisma.codigoQr.create({
        data: {
          estudianteId: estudianteGuardado.id,
          token: `QR-TOKEN-MOCK-${estudianteGuardado.cod_sis}`,
          generadoEn: new Date(),
          expiraEn: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // ==========================================
  // 6. FLUJO EXÁMENES (RESERVAS, EXAMEN, INSCRITOS, INGRESOS)
  // ==========================================
  let reservaPrueba = await prisma.reservaAmbiente.findFirst({
    where: { motivo: 'Examen 1er Parcial - BD1' },
  });
  if (!reservaPrueba) {
    reservaPrueba = await prisma.reservaAmbiente.create({
      data: {
        ambienteId: aulaLab.id,
        usuarioId: docenteJuan.id,
        fecha: new Date(),
        horaIni: new Date('1970-01-01T08:15:00Z'),
        horaFin: new Date('1970-01-01T09:45:00Z'),
        motivo: 'Examen 1er Parcial - BD1',
        estadoAulaId: 1,
      },
    });
  }

  let examenPrueba = await prisma.examen.findFirst({
    where: { reservaAmbienteId: reservaPrueba.id },
  });
  if (!examenPrueba) {
    examenPrueba = await prisma.examen.create({
      data: {
        reservaAmbienteId: reservaPrueba.id,
        usuarioId: docenteJuan.id,
        tipoExamen: 'Primer Parcial',
        normasEx: 'Prohibido calculadoras y celulares.',
        estadoExamId: 1, // AQUI LE PASAMOS EL DATO OBLIGATORIO DE TU SCHEMA
        estado: EstadoExamen.PROGRAMADO,
      },
    });
  }

  await prisma.examen_Carrera_Materia.upsert({
    where: {
      examenId_carreraId_materiaId: {
        examenId: examenPrueba.id,
        carreraId: carSistemas.id,
        materiaId: materiaBD1.id,
      },
    },
    update: {},
    create: {
      examenId: examenPrueba.id,
      carreraId: carSistemas.id,
      materiaId: materiaBD1.id,
    },
  });

  for (const est of estudiantesGuardados) {
    await prisma.examen_Estudiante.upsert({
      where: {
        estudianteId_examenId: {
          estudianteId: est.id,
          examenId: examenPrueba.id,
        },
      },
      update: {},
      create: {
        estudianteId: est.id,
        examenId: examenPrueba.id,
        estado_habilitado: true,
      },
    });
  }

  const ingresoExiste = await prisma.ingreso.findFirst({
    where: { estudianteId: estudiantesGuardados[0].id },
  });
  if (!ingresoExiste) {
    await prisma.ingreso.create({
      data: {
        estudianteId: estudiantesGuardados[0].id,
        examenId: examenPrueba.id,
        fechaHora: new Date(),
        metodo: 'Escaneo QR',
        registradoPor: guardiaTapia.id,
      },
    });
  }

  // ==========================================
  // 7. BITÁCORA DE AUDITORÍA
  // ==========================================
  const auditoriaExiste = await prisma.bitacora_Auditoria.findFirst({
    where: { accion: 'MOCK_SEED_EJECUTADO' },
  });
  if (!auditoriaExiste) {
    await prisma.bitacora_Auditoria.createMany({
      data: [
        {
          usuarioId: admin.id,
          accion: 'MOCK_SEED_EJECUTADO',
          modulo: 'Sistema',
          tablaAfectada: 'Varias',
          detallesNuevo: { info: 'Base de datos poblada para pruebas HU2' },
          ipOrigen: '127.0.0.1',
          fechaHora: new Date(),
        },
        {
          usuarioId: docenteJuan.id,
          accion: 'CREACION',
          modulo: 'Exámenes',
          tablaAfectada: 'Examen',
          registroId: examenPrueba.id,
          detallesNuevo: { tipo: 'Primer Parcial', materia: 'BD1' },
          ipOrigen: '127.0.0.1',
          fechaHora: new Date(),
        },
      ],
    });
  }

  console.log(
    '¡Seed ejecutado satisfactoriamente! Todas las tablas han sido pobladas.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
