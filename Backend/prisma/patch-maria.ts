/**
 * Patch: agrega alcances y reservas a María Gómez (maria.gomez@docente.umss.edu)
 * para que pueda ver exámenes de su alcance y crear nuevos.
 *
 * Ejecutar: npx ts-node prisma/patch-maria.ts
 */
import { PrismaClient, EstadoAula } from '@prisma/client';

const prisma = new PrismaClient();

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
  const CORREO = 'maria.gomez@docente.umss.edu';

  const maria = await prisma.usuario.findUnique({ where: { correo: CORREO } });
  if (!maria) {
    console.error(`Usuario ${CORREO} no encontrado en la BD`);
    process.exit(1);
  }
  console.log(`✔ María encontrada: id=${maria.id}`);

  // 1. Asignar alcances: BD1 (materia:1, carrera:1) e ISW (materia:2, carrera:1)
  await prisma.usuario_Alcance.deleteMany({ where: { usuarioId: maria.id } });
  await prisma.usuario_Alcance.createMany({
    data: [
      { usuarioId: maria.id, materiaId: 1, carreraId: 1, facultadId: 1 },
      { usuarioId: maria.id, materiaId: 2, carreraId: 1, facultadId: 1 },
    ],
  });
  console.log('✔ Alcances asignados: BD1 + ISW en Ingeniería de Sistemas');

  // 2. Obtener ambientes para crear reservas
  const ambientes = await prisma.ambiente.findMany({
    take: 3,
    orderBy: { id: 'asc' },
  });
  if (ambientes.length === 0) {
    console.error('No hay ambientes en la BD');
    process.exit(1);
  }

  // 3. Crear 4 reservas futuras para María
  const MARCA = '[MOCK-MARIA]';
  await prisma.reservaAmbiente.deleteMany({
    where: { usuarioId: maria.id, motivo: { startsWith: MARCA } },
  });

  const reservasData = [
    {
      dias: 5,
      ambienteIdx: 0,
      horaIni: 8,
      horaFin: 10,
      motivo: `${MARCA} Parcial BD1`,
    },
    {
      dias: 12,
      ambienteIdx: 1,
      horaIni: 14,
      horaFin: 16,
      motivo: `${MARCA} Final ISW`,
    },
    {
      dias: 20,
      ambienteIdx: 0,
      horaIni: 8,
      horaFin: 10,
      motivo: `${MARCA} Segundo parcial BD1`,
    },
    {
      dias: 35,
      ambienteIdx: 2,
      horaIni: 16,
      horaFin: 18,
      motivo: `${MARCA} Examen final BD1`,
    },
  ];

  for (const r of reservasData) {
    const amb = ambientes[r.ambienteIdx] ?? ambientes[0];
    await prisma.reservaAmbiente.create({
      data: {
        ambienteId: amb.id,
        usuarioId: maria.id,
        fecha: fechaRelativa(r.dias),
        horaIni: hora(r.horaIni),
        horaFin: hora(r.horaFin),
        motivo: r.motivo,
        estadoAulaId: 1,
        estadoAula: EstadoAula.RESERVADO,
      },
    });
  }
  console.log(`✔ 4 reservas futuras creadas para María`);

  // Mostrar resumen
  const alcances = await prisma.usuario_Alcance.findMany({
    where: { usuarioId: maria.id },
  });
  const reservas = await prisma.reservaAmbiente.findMany({
    where: { usuarioId: maria.id },
    orderBy: { fecha: 'asc' },
  });
  console.log(`\n=== RESUMEN ===`);
  console.log(`Alcances: ${alcances.length}`);
  console.log(`Reservas: ${reservas.length}`);
  for (const r of reservas) {
    console.log(
      `  reserva:${r.id} fecha:${r.fecha?.toISOString().split('T')[0]} motivo:${r.motivo}`,
    );
  }
  console.log(
    '\n✔ Listo. Ahora María puede ver exámenes de BD1 e ISW, y crear nuevos.',
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
