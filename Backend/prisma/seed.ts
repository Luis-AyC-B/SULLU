/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando poblado de datos (seeding)...');

  // 1. Crear Módulos
  const modulos = ['Usuarios', 'Roles', 'Estudiantes', 'Exámenes'];
  for (const nombre of modulos) {
    await prisma.modulo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // 2. Definir Permisos Maestros (incluyendo los .ver requeridos por el servicio)
  const permisosBase = [
    { clave: 'usuarios.ver', modulo: 'Usuarios' },
    { clave: 'usuarios.crear', modulo: 'Usuarios' },
    { clave: 'usuarios.editar', modulo: 'Usuarios' },
    { clave: 'usuarios.desactivar', modulo: 'Usuarios' },
    { clave: 'roles.ver', modulo: 'Roles' },
    { clave: 'roles.crear', modulo: 'Roles' },
    { clave: 'roles.editar', modulo: 'Roles' },
    { clave: 'roles.eliminar', modulo: 'Roles' },
    { clave: 'estudiantes.ver', modulo: 'Estudiantes' },
    { clave: 'estudiantes.registrar', modulo: 'Estudiantes' },
    { clave: 'estudiantes.habilitar', modulo: 'Estudiantes' },
    { clave: 'examenes.ver', modulo: 'Exámenes' },
    { clave: 'examenes.crear', modulo: 'Exámenes' },
    { clave: 'examenes.editar', modulo: 'Exámenes' },
    { clave: 'examenes.eliminar', modulo: 'Exámenes' },
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

  // 3. Crear o actualizar Plantillas Base asegurando que sus permisos se sincronicen siempre
  await prisma.rol.upsert({
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

  await prisma.rol.upsert({
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

  await prisma.rol.upsert({
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

  // 4. Crear Usuario Administrador de prueba
  const hashAdmin = await bcrypt.hash('admin123', 10);
  const rolAdminObj = await prisma.rol.findUnique({
    where: { nombre: 'Administrador' },
  });

  await prisma.usuario.upsert({
    where: { correo: 'admin@exacontrol.com' },
    update: { password: hashAdmin },
    create: {
      nombre: 'Admin',
      correo: 'admin@exacontrol.com',
      password: hashAdmin,
      roles: {
        create: { rolId: rolAdminObj!.id },
      },
    },
  });

  console.log('Seed ejecutado satisfactoriamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
