/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando script de limpieza de datos de prueba...');

  const dbUrl = process.env.DATABASE_URL || '';
  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('::1') ||
    dbUrl.includes('host.docker.internal');

  if (!isLocal) {
    console.error(
      '❌ SEGURIDAD: El script de limpieza solo puede ejecutarse contra una base de datos local (localhost / 127.0.0.1). DATABASE_URL:',
      dbUrl,
    );
    process.exit(1);
  }

  // 1. Buscar IDs de exámenes de prueba
  const examenesPrueba = await prisma.examen.findMany({
    where: { tipoExamen: { startsWith: '[PRUEBA]' } },
    select: { id: true, reservaAmbienteId: true },
  });
  const examenIds = examenesPrueba.map((e) => e.id);
  const reservaIds = examenesPrueba
    .map((e) => e.reservaAmbienteId)
    .filter(Boolean);

  // 2. Buscar IDs de estudiantes de prueba
  const estudiantesPrueba = await prisma.estudiante.findMany({
    where: {
      OR: [
        { cod_sis: { startsWith: 'PRU' } },
        { cod_sis: { startsWith: '2024000' } },
      ],
    },
    select: { id: true },
  });
  const estudianteIds = estudiantesPrueba.map((e) => e.id);

  // 3. Buscar IDs de usuarios colaboradores de prueba
  const correosTest = [
    'control.prueba1@umss.edu',
    'control.prueba2@umss.edu',
    'control.prueba3@umss.edu',
    'control.noasignado@umss.edu',
  ];
  const usuariosPrueba = await prisma.usuario.findMany({
    where: { correo: { in: correosTest } },
    select: { id: true },
  });
  const usuarioIds = usuariosPrueba.map((u) => u.id);

  console.log(
    `Detectados: ${examenIds.length} exámenes, ${estudianteIds.length} estudiantes, ${usuarioIds.length} colaboradores de prueba.`,
  );

  // 4. Eliminar incidencias
  const delIncidencias = await prisma.incidenciaIngreso.deleteMany({
    where: {
      OR: [
        { examenId: { in: examenIds } },
        { estudianteId: { in: estudianteIds } },
        { registradoPor: { in: usuarioIds } },
      ],
    },
  });

  // 5. Eliminar ingresos
  const delIngresos = await prisma.ingreso.deleteMany({
    where: {
      OR: [
        { examenId: { in: examenIds } },
        { estudianteId: { in: estudianteIds } },
        { registradoPor: { in: usuarioIds } },
      ],
    },
  });

  // 6. Eliminar códigos QR
  const delQrs = await prisma.codigoQr.deleteMany({
    where: {
      OR: [
        { examenId: { in: examenIds } },
        { estudianteId: { in: estudianteIds } },
      ],
    },
  });

  // 7. Eliminar relaciones de examen con estudiante
  const delExamenEst = await prisma.examen_Estudiante.deleteMany({
    where: {
      OR: [
        { examenId: { in: examenIds } },
        { estudianteId: { in: estudianteIds } },
      ],
    },
  });

  // 8. Eliminar controladores asignados
  const delControladores = await prisma.examenControlador.deleteMany({
    where: {
      OR: [
        { examenId: { in: examenIds } },
        { colaboradorId: { in: usuarioIds } },
      ],
    },
  });

  // 9. Eliminar carrera materia
  await prisma.examen_Carrera_Materia.deleteMany({
    where: { examenId: { in: examenIds } },
  });

  // 10. Eliminar exámenes
  const delExamenes = await prisma.examen.deleteMany({
    where: { id: { in: examenIds } },
  });

  // 11. Eliminar reservas creadas para los exámenes
  if (reservaIds.length > 0) {
    await prisma.reservaAmbiente.deleteMany({
      where: { id: { in: reservaIds } },
    });
  }

  // 12. Eliminar roles de usuarios de prueba
  await prisma.usuario_Rol.deleteMany({
    where: { usuarioId: { in: usuarioIds } },
  });

  // 13. Eliminar usuarios de prueba
  const delUsuarios = await prisma.usuario.deleteMany({
    where: { id: { in: usuarioIds } },
  });

  // 14. Eliminar estudiantes de prueba
  const delEstudiantes = await prisma.estudiante.deleteMany({
    where: { id: { in: estudianteIds } },
  });

  console.log(`✨ Limpieza completada con éxito:`);
  console.log(`   - Ingresos eliminados: ${delIngresos.count}`);
  console.log(`   - Incidencias eliminadas: ${delIncidencias.count}`);
  console.log(`   - Códigos QR eliminados: ${delQrs.count}`);
  console.log(`   - Inscripciones eliminadas: ${delExamenEst.count}`);
  console.log(`   - Asignaciones de control: ${delControladores.count}`);
  console.log(`   - Exámenes eliminados: ${delExamenes.count}`);
  console.log(`   - Estudiantes eliminados: ${delEstudiantes.count}`);
  console.log(`   - Colaboradores eliminados: ${delUsuarios.count}`);
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
