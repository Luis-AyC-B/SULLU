/* eslint-disable no-console */
import { PrismaClient, Permiso } from '@prisma/client';

const prisma = new PrismaClient();

// HU19: Registro de expulsión de examen
// Seed independiente e idempotente: no borra ni modifica datos existentes.
const NOMBRE_MODULO = 'Expulsiones';

const PERMISOS = [
  { clave: 'expulsiones.ver', descripcion: 'Ver expulsiones de examen' },
  {
    clave: 'expulsiones.registrar',
    descripcion: 'Registrar expulsión de estudiante',
  },
];

// Roles que reciben los permisos de la HU19
const ROLES_CON_ACCESO = ['Docente'];

async function main() {
  const modulo = await prisma.modulo.upsert({
    where: { nombre: NOMBRE_MODULO },
    update: {},
    create: { nombre: NOMBRE_MODULO },
  });

  const permisos: Permiso[] = [];
  for (const p of PERMISOS) {
    const permiso = await prisma.permiso.upsert({
      where: { clave: p.clave },
      update: {},
      create: {
        clave: p.clave,
        descripcion: p.descripcion,
        moduloId: modulo.id,
      },
    });
    permisos.push(permiso);
  }

  for (const nombreRol of ROLES_CON_ACCESO) {
    const rol = await prisma.rol.findFirst({
      where: { nombre: { equals: nombreRol, mode: 'insensitive' } },
    });

    if (!rol) {
      console.warn(`Rol "${nombreRol}" no encontrado, se omite.`);
      continue;
    }

    for (const permiso of permisos) {
      await prisma.rol_Permiso.upsert({
        where: {
          rolId_permisoId: { rolId: rol.id, permisoId: permiso.id },
        },
        update: {},
        create: { rolId: rol.id, permisoId: permiso.id },
      });
    }

    await prisma.rol_Modulo.upsert({
      where: {
        rolId_moduloId: { rolId: rol.id, moduloId: modulo.id },
      },
      update: {},
      create: { rolId: rol.id, moduloId: modulo.id },
    });

    console.log(
      `Rol "${rol.nombre}": ${permisos.map((p) => p.clave).join(', ')}`,
    );
  }

  console.log('Seed HU19 aplicado correctamente.');
}

main()
  .catch((e) => {
    console.error('Error en seed HU19:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
