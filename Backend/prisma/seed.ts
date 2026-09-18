/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Crear roles base requeridos
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: { nombre: 'Administrador' },
  });

  const rolDocente = await prisma.rol.upsert({
    where: { nombre: 'Docente' },
    update: {},
    create: { nombre: 'Docente' },
  });

  const rolControl = await prisma.rol.upsert({
    where: { nombre: 'Personal de control de ingreso' },
    update: {},
    create: { nombre: 'Personal de control de ingreso' },
  });

  // 2. Crear usuarios de prueba y asociarlos a sus roles correspondientes
  await prisma.usuario.upsert({
    where: { correo: 'admin@exacontrol.com' },
    update: {},
    create: {
      nombre: 'Admin',
      correo: 'admin@exacontrol.com',
      password: 'admin123',
      roles: {
        create: { rolId: rolAdmin.id },
      },
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'docente@exacontrol.com' },
    update: {},
    create: {
      nombre: 'Docente',
      correo: 'docente@exacontrol.com',
      password: 'docente123',
      roles: {
        create: { rolId: rolDocente.id },
      },
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'control@exacontrol.com' },
    update: {},
    create: {
      nombre: 'Control',
      correo: 'control@exacontrol.com',
      password: 'control123',
      roles: {
        create: { rolId: rolControl.id },
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
