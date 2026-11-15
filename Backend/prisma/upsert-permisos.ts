import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando upsert de módulo y permisos de expulsiones...');

  // 1. Modulo "Expulsiones"
  let modulo = await prisma.modulo.findFirst({
    where: { nombre: { equals: 'Expulsiones', mode: 'insensitive' } },
  });

  if (!modulo) {
    modulo = await prisma.modulo.create({
      data: {
        nombre: 'Expulsiones',
        activo: true,
      },
    });
    console.log(`Módulo creado: ${modulo.nombre} (id: ${modulo.id})`);
  } else {
    modulo = await prisma.modulo.update({
      where: { id: modulo.id },
      data: { activo: true },
    });
    console.log(
      `Módulo existente actualizado/confirmado: ${modulo.nombre} (id: ${modulo.id})`,
    );
  }

  // 2. Permisos
  const permisosDef = [
    {
      clave: 'expulsiones.ver',
      descripcion: 'Ver expulsiones de estudiantes',
    },
    {
      clave: 'expulsiones.registrar',
      descripcion: 'Registrar expulsion de estudiante',
    },
  ];

  const permisosCreados: Array<{ id: number; clave: string }> = [];
  for (const def of permisosDef) {
    const perm = await prisma.permiso.upsert({
      where: { clave: def.clave },
      update: {
        moduloId: modulo.id,
        descripcion: def.descripcion,
      },
      create: {
        moduloId: modulo.id,
        clave: def.clave,
        descripcion: def.descripcion,
      },
    });
    permisosCreados.push(perm);
    console.log(`Permiso upserted: ${perm.clave} (id: ${perm.id})`);
  }

  // 3. Asignar al rol Docente
  const rolDocente = await prisma.rol.findFirst({
    where: { nombre: { equals: 'Docente', mode: 'insensitive' } },
  });

  if (!rolDocente) {
    throw new Error('No se encontró el rol Docente en la base de datos');
  }

  for (const p of permisosCreados) {
    await prisma.rol_Permiso.upsert({
      where: {
        rolId_permisoId: {
          rolId: rolDocente.id,
          permisoId: p.id,
        },
      },
      update: {},
      create: {
        rolId: rolDocente.id,
        permisoId: p.id,
      },
    });
    console.log(
      `Permiso ${p.clave} asignado al rol Docente (${rolDocente.id})`,
    );
  }

  await prisma.rol_Modulo.upsert({
    where: {
      rolId_moduloId: {
        rolId: rolDocente.id,
        moduloId: modulo.id,
      },
    },
    update: {},
    create: {
      rolId: rolDocente.id,
      moduloId: modulo.id,
    },
  });
  console.log(`Módulo ${modulo.nombre} asignado a rol Docente`);

  // Asignar también a roles administradores si existen
  const rolesAdmin = await prisma.rol.findMany({
    where: {
      nombre: { in: ['Administrador Total', 'Administrador'] },
    },
  });

  for (const r of rolesAdmin) {
    for (const p of permisosCreados) {
      await prisma.rol_Permiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: r.id,
            permisoId: p.id,
          },
        },
        update: {},
        create: {
          rolId: r.id,
          permisoId: p.id,
        },
      });
    }
    await prisma.rol_Modulo.upsert({
      where: {
        rolId_moduloId: {
          rolId: r.id,
          moduloId: modulo.id,
        },
      },
      update: {},
      create: {
        rolId: r.id,
        moduloId: modulo.id,
      },
    });
  }

  console.log('Upsert de módulo y permisos completado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
