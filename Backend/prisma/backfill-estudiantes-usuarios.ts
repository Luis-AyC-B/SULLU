/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function backfill() {
  console.log(
    '[BACKFILL HU6] Iniciando backfill de estudiantes sin usuario...',
  );

  const rolEstudiante = await prisma.rol.upsert({
    where: { nombre: 'Estudiante' },
    update: {},
    create: {
      nombre: 'Estudiante',
      descripcion: 'Acceso al portal estudiantil',
      esPlantilla: true,
    },
  });

  const estudiantesSinUsuario = await prisma.estudiante.findMany({
    where: {
      OR: [{ usuarioId: null }, { usuario: isNullOrEmpty() }],
    },
    include: { usuario: true },
  });

  function isNullOrEmpty() {
    return undefined;
  }

  const pendientes = estudiantesSinUsuario.filter(
    (e) => !e.usuarioId || !e.usuario,
  );

  console.log(
    `[BACKFILL HU6] Encontrados ${pendientes.length} estudiantes sin cuenta.`,
  );

  let creados = 0;
  let conCi = 0;
  let sinCi = 0;

  for (const est of pendientes) {
    const codSisLimpio = est.cod_sis.trim().toLowerCase();
    const emailInstitucional = `${codSisLimpio}@est.umss.edu.bo`;

    let passwordPlana: string;
    let tieneCi = false;

    if (est.ci && est.ci.trim().length > 0) {
      passwordPlana = est.ci.trim();
      tieneCi = true;
      conCi++;
    } else {
      passwordPlana = crypto.randomBytes(6).toString('hex');
      sinCi++;
    }

    const passwordHash = await bcrypt.hash(passwordPlana, 10);

    await prisma.$transaction(async (tx) => {
      // Verificar si ya existe un usuario con este correo
      let usuario = await tx.usuario.findFirst({
        where: { correo: { equals: emailInstitucional, mode: 'insensitive' } },
      });

      if (!usuario) {
        usuario = await tx.usuario.create({
          data: {
            nombre: est.nombre,
            apellido: est.apellido,
            correo: emailInstitucional,
            password: passwordHash,
            debeConfigurarPerfil: true,
            debeCambiarPassword: true,
            roles: {
              create: [{ rolId: rolEstudiante.id }],
            },
          },
        });
      } else {
        // Asegurar que tenga el rol Estudiante
        const yaTieneRol = await tx.usuario_Rol.findUnique({
          where: {
            usuarioId_rolId: {
              usuarioId: usuario.id,
              rolId: rolEstudiante.id,
            },
          },
        });
        if (!yaTieneRol) {
          await tx.usuario_Rol.create({
            data: {
              usuarioId: usuario.id,
              rolId: rolEstudiante.id,
            },
          });
        }
      }

      await tx.estudiante.update({
        where: { id: est.id },
        data: {
          usuarioId: usuario.id,
          perfilCompleto: false,
          qrVersion: 1,
        },
      });
    });

    creados++;
    console.log(
      ` -> Estudiante ${est.cod_sis} (${est.nombre}): vinculado a ${emailInstitucional} [${
        tieneCi ? 'CI como clave' : 'Clave temporal aleatoria'
      }]`,
    );
  }

  console.log(
    `[BACKFILL HU6] Finalizado: ${creados} usuarios procesados (${conCi} con CI, ${sinCi} con clave temporal).`,
  );
}

backfill()
  .catch((err) => {
    console.error('[BACKFILL HU6] Error durante el backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
