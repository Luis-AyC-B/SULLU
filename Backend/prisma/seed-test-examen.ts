/* eslint-disable no-console */
import { PrismaClient, EstadoExamen } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const QR_SECRET = process.env.QR_SECRET || 'dev-qr-secret';
const jwtService = new JwtService({ secret: QR_SECRET });

async function main() {
  console.log('🚀 Iniciando Seed Integral de Pruebas Offline/Online...');

  const dbUrl = process.env.DATABASE_URL || '';
  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('::1') ||
    dbUrl.includes('host.docker.internal');

  if (!isLocal) {
    console.error(
      '❌ SEGURIDAD: El seed de prueba solo puede ejecutarse contra una base de datos local (localhost / 127.0.0.1).',
    );
    process.exit(1);
  }

  // 1. Limpieza preventiva de datos previos de prueba
  console.log('🧹 Limpiando datos de estudiantes y QRs de prueba previos...');
  const estPrevios = await prisma.estudiante.findMany({
    where: {
      OR: [
        { cod_sis: { startsWith: 'PRU' } },
        { cod_sis: { startsWith: '2024000' } },
      ],
    },
    select: { id: true },
  });
  const prevEstIds = estPrevios.map((e) => e.id);

  if (prevEstIds.length > 0) {
    await prisma.incidenciaIngreso.deleteMany({
      where: { estudianteId: { in: prevEstIds } },
    });
    await prisma.ingreso.deleteMany({
      where: { estudianteId: { in: prevEstIds } },
    });
    await prisma.codigoQr.deleteMany({
      where: { estudianteId: { in: prevEstIds } },
    });
    await prisma.examen_Estudiante.deleteMany({
      where: { estudianteId: { in: prevEstIds } },
    });
    await prisma.estudiante.deleteMany({
      where: { id: { in: prevEstIds } },
    });
  }

  // 2. Determinar el Examen Activo principal (priorizar el examen de pruebas con horario 00:00-23:59 seleccionado en la app)
  let examenActivo = await prisma.examen.findFirst({
    where: { tipoExamen: { startsWith: '[PRUEBA] Examen Activo' } },
    include: {
      reservaAmbiente: { include: { ambiente: true } },
      carrerasMaterias: {
        include: { carrera_materia: { include: { materia: true } } },
      },
    },
  });

  if (!examenActivo) {
    examenActivo = await prisma.examen.findUnique({
      where: { id: 1 },
      include: {
        reservaAmbiente: { include: { ambiente: true } },
        carrerasMaterias: {
          include: { carrera_materia: { include: { materia: true } } },
        },
      },
    });
  }

  const ahora = new Date();

  // Si no existe examen 1, buscar o crear uno activo
  if (!examenActivo) {
    const docente = await prisma.usuario.findFirst();
    if (!docente) throw new Error('Se requiere al menos un usuario en la BD.');

    const horaIni = new Date('1970-01-01T00:00:00Z');
    const horaFin = new Date('1970-01-01T23:59:59Z');
    let horario = await prisma.horarioFijo.findFirst();
    if (!horario) {
      horario = await prisma.horarioFijo.create({
        data: { periodoNombre: 'Periodo Completo', horaIni, horaFin },
      });
    }

    let ambiente = await prisma.ambiente.findFirst();
    if (!ambiente) {
      ambiente = await prisma.ambiente.create({
        data: {
          nombre: 'Laboratorio Informática 1 (FCyT)',
          capacidad: 45,
          tipoAulaId: 1,
        },
      });
    }

    const reserva = await prisma.reservaAmbiente.create({
      data: {
        ambienteId: ambiente.id,
        docenteId: docente.id,
        horarioFijoId: horario.id,
        fecha: ahora,
        estado: 'RESERVADO',
      },
    });

    examenActivo = await prisma.examen.create({
      data: {
        reservaAmbienteId: reserva.id,
        usuarioId: docente.id,
        tipoExamen: 'Algoritmos y Programación',
        normasEx:
          'Examen de prueba para validación y sincronización offline/online.',
        estadoExamId: 1,
        estado: EstadoExamen.EN_CURSO,
      },
      include: {
        reservaAmbiente: { include: { ambiente: true } },
        carrerasMaterias: {
          include: { carrera_materia: { include: { materia: true } } },
        },
      },
    });
  }

  // Asegurar que el examen activo esté en estado EN_CURSO y abarque hoy
  await prisma.examen.update({
    where: { id: examenActivo.id },
    data: { estado: EstadoExamen.EN_CURSO },
  });

  // 3. Examen Secundario (para la prueba de "QR de Otro Examen")
  let examenSecundario = await prisma.examen.findFirst({
    where: {
      id: { not: examenActivo.id },
      tipoExamen: { startsWith: '[PRUEBA] Examen Secundario' },
    },
  });

  if (!examenSecundario) {
    const reservaSec = await prisma.reservaAmbiente.create({
      data: {
        ambienteId: examenActivo.reservaAmbiente?.ambienteId || 1,
        docenteId: examenActivo.usuarioId,
        horarioFijoId: examenActivo.reservaAmbiente?.horarioFijoId || 1,
        fecha: ahora,
        estado: 'RESERVADO',
      },
    });

    examenSecundario = await prisma.examen.create({
      data: {
        reservaAmbienteId: reservaSec.id,
        usuarioId: examenActivo.usuarioId,
        tipoExamen: '[PRUEBA] Examen Secundario - Auditoría de Sistemas',
        normasEx: 'Examen secundario para pruebas de QR de otro examen.',
        estadoExamId: 1,
        estado: EstadoExamen.EN_CURSO,
      },
    });
  }

  console.log(
    `✅ Examen Activo vinculado: ID ${examenActivo.id} (${examenActivo.tipoExamen})`,
  );
  console.log(
    `✅ Examen Secundario vinculado: ID ${examenSecundario.id} (${examenSecundario.tipoExamen})`,
  );

  // 4. Colaboradores de Control (3 asignados + 1 NO asignado)
  const passwordHash = await bcrypt.hash('Control123*', 10);
  const rolControl =
    (await prisma.rol.findFirst({
      where: { nombre: { contains: 'Control', mode: 'insensitive' } },
    })) || (await prisma.rol.findFirst());

  const colaboradoresData = [
    {
      correo: 'control.prueba1@umss.edu',
      nombre: 'Juan Carlos',
      apellido: 'Pérez Control 1',
      asignar: true,
    },
    {
      correo: 'control.prueba2@umss.edu',
      nombre: 'María Elena',
      apellido: 'Gómez Control 2',
      asignar: true,
    },
    {
      correo: 'control.prueba3@umss.edu',
      nombre: 'Pedro Luis',
      apellido: 'Rocha Control 3',
      asignar: true,
    },
    {
      correo: 'control.noasignado@umss.edu',
      nombre: 'Sergio Andrés',
      apellido: 'Colaborador No Asignado',
      asignar: false,
    },
  ];

  for (const c of colaboradoresData) {
    const usuario = await prisma.usuario.upsert({
      where: { correo: c.correo },
      create: {
        correo: c.correo,
        nombre: c.nombre,
        apellido: c.apellido,
        password: passwordHash,
      },
      update: {
        nombre: c.nombre,
        apellido: c.apellido,
        password: passwordHash,
      },
    });

    if (rolControl) {
      await prisma.usuario_Rol.upsert({
        where: {
          usuarioId_rolId: { usuarioId: usuario.id, rolId: rolControl.id },
        },
        create: { usuarioId: usuario.id, rolId: rolControl.id },
        update: {},
      });
    }

    if (c.asignar) {
      await prisma.examenControlador.upsert({
        where: {
          examenId_colaboradorId: {
            examenId: examenActivo.id,
            colaboradorId: usuario.id,
          },
        },
        create: {
          examenId: examenActivo.id,
          colaboradorId: usuario.id,
          asignadoPor: examenActivo.usuarioId,
          rolAsignacion: 'Control principal',
        },
        update: {
          rolAsignacion: 'Control principal',
        },
      });

      // Asegurar asignación también a Examen 1
      if (examenActivo.id !== 1) {
        await prisma.examenControlador
          .upsert({
            where: {
              examenId_colaboradorId: {
                examenId: 1,
                colaboradorId: usuario.id,
              },
            },
            create: {
              examenId: 1,
              colaboradorId: usuario.id,
              asignadoPor: examenActivo.usuarioId,
              rolAsignacion: 'Control principal',
            },
            update: {
              rolAsignacion: 'Control principal',
            },
          })
          .catch(() => {});
      }
      console.log(
        `👤 Colaborador ASIGNADO: ${c.nombre} ${c.apellido} (${c.correo}) - Pass: Control123*`,
      );
    } else {
      await prisma.examenControlador.deleteMany({
        where: {
          examenId: examenActivo.id,
          colaboradorId: usuario.id,
        },
      });
      console.log(
        `⛔ Colaborador NO ASIGNADO: ${c.nombre} ${c.apellido} (${c.correo}) - Pass: Control123*`,
      );
    }
  }

  // 5. Estudiantes de Prueba (usando SIS numéricos 202400001 a 202400006)
  // E1: Habilitado con QR (Carlos Gutiérrez)
  const est1 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400001',
      ci: '10000001',
      nombre: 'Carlos',
      apellido: 'Gutiérrez Arze',
      qrVersion: 1,
    },
  });

  // E2: Habilitado con QR (Mariana Vargas)
  const est2 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400002',
      ci: '10000002',
      nombre: 'Mariana',
      apellido: 'Vargas Mercado',
      qrVersion: 1,
    },
  });

  // E3: Habilitado SIN QR (Lucía Mendoza - para registro manual)
  const est3 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400003',
      ci: '10000003',
      nombre: 'Lucía',
      apellido: 'Mendoza Soliz',
      qrVersion: 1,
    },
  });

  // E4: Estudiante NO Habilitado (Roberto Morales)
  const est4 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400004',
      ci: '10000004',
      nombre: 'Roberto',
      apellido: 'Morales Rojas',
      qrVersion: 1,
    },
  });

  // E5: Estudiante con QR Revocado (Alejandra Pinto: qrVersion en DB = 2)
  const est5 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400005',
      ci: '10000005',
      nombre: 'Alejandra',
      apellido: 'Pinto Castro',
      qrVersion: 2,
    },
  });

  // E6: Estudiante Habilitado para QR con Firma Falsa (Felipe Arancibia)
  const est6 = await prisma.estudiante.create({
    data: {
      cod_sis: '202400006',
      ci: '10000006',
      nombre: 'Felipe',
      apellido: 'Arancibia Siles',
      qrVersion: 1,
    },
  });

  // 6. Inscribir estudiantes en el examen activo
  await prisma.examen_Estudiante.createMany({
    data: [
      {
        examenId: examenActivo.id,
        estudianteId: est1.id,
        estado_habilitado: true,
      },
      {
        examenId: examenActivo.id,
        estudianteId: est2.id,
        estado_habilitado: true,
      },
      {
        examenId: examenActivo.id,
        estudianteId: est3.id,
        estado_habilitado: true,
      },
      {
        examenId: examenActivo.id,
        estudianteId: est4.id,
        estado_habilitado: false,
        motivo_inhabilitacion: 'Inhabilitado por falta de matrícula y pagos',
      },
      {
        examenId: examenActivo.id,
        estudianteId: est5.id,
        estado_habilitado: true,
      },
      {
        examenId: examenActivo.id,
        estudianteId: est6.id,
        estado_habilitado: true,
      },
    ],
  });

  if (examenActivo.id !== 1) {
    await prisma.examen_Estudiante
      .createMany({
        data: [
          { examenId: 1, estudianteId: est1.id, estado_habilitado: true },
          { examenId: 1, estudianteId: est2.id, estado_habilitado: true },
          { examenId: 1, estudianteId: est3.id, estado_habilitado: true },
          {
            examenId: 1,
            estudianteId: est4.id,
            estado_habilitado: false,
            motivo_inhabilitacion:
              'Inhabilitado por falta de matrícula y pagos',
          },
          { examenId: 1, estudianteId: est5.id, estado_habilitado: true },
          { examenId: 1, estudianteId: est6.id, estado_habilitado: true },
        ],
        skipDuplicates: true,
      })
      .catch(() => {});
  }

  // Inscribir también al examen secundario a E2
  await prisma.examen_Estudiante.create({
    data: {
      examenId: examenSecundario.id,
      estudianteId: est2.id,
      estado_habilitado: true,
    },
  });

  console.log(
    `📋 Nómina de 6 estudiantes de prueba inscrita en el examen ID ${examenActivo.id}.`,
  );

  // 7. Generación de Códigos QR para el examen activo
  const finExamen = new Date(ahora.getTime() + 6 * 60 * 60 * 1000); // En 6 horas
  const hace2Horas = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);

  // QR 1: Válido E1 (Carlos Gutiérrez)
  const tokenValido1 = jwtService.sign({
    sub: est1.id,
    codSis: est1.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est1.id,
      examenId: examenActivo.id,
      tipo: 'examen',
      token: tokenValido1,
      generadoEn: ahora,
      expiraEn: finExamen,
    },
  });

  // QR 2: Válido E2 (Mariana Vargas)
  const tokenValido2 = jwtService.sign({
    sub: est2.id,
    codSis: est2.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est2.id,
      examenId: examenActivo.id,
      tipo: 'examen',
      token: tokenValido2,
      generadoEn: ahora,
      expiraEn: finExamen,
    },
  });

  // QR 3: Estudiante Inhabilitado E4 (Roberto Morales)
  const tokenInhabilitado = jwtService.sign({
    sub: est4.id,
    codSis: est4.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est4.id,
      examenId: examenActivo.id,
      tipo: 'examen',
      token: tokenInhabilitado,
      generadoEn: ahora,
      expiraEn: finExamen,
    },
  });

  // QR 4: Vencido / Caducado (Estudiante Mariana Vargas pero expirado en el pasado)
  const tokenVencido = jwtService.sign({
    sub: est2.id,
    codSis: est2.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor((ahora.getTime() - 4 * 60 * 60 * 1000) / 1000),
    exp: Math.floor(hace2Horas.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est2.id,
      examenId: examenActivo.id,
      tipo: 'examen',
      token: tokenVencido,
      generadoEn: new Date(ahora.getTime() - 4 * 60 * 60 * 1000),
      expiraEn: hace2Horas,
    },
  });

  // QR 5: Revocado (Estudiante Alejandra Pinto: token emitido con qrVersion=1, pero estudiante tiene qrVersion=2)
  const tokenRevocado = jwtService.sign({
    sub: est5.id,
    codSis: est5.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1, // Desfasado respecto a DB (qrVersion 2)
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est5.id,
      examenId: examenActivo.id,
      tipo: 'examen',
      token: tokenRevocado,
      generadoEn: ahora,
      expiraEn: finExamen,
    },
  });

  // QR 6: De Otro Examen (Examen Secundario)
  const tokenOtroExamen = jwtService.sign({
    sub: est2.id,
    codSis: est2.cod_sis,
    examenId: examenSecundario.id, // Examen distinto
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: est2.id,
      examenId: examenSecundario.id,
      tipo: 'examen',
      token: tokenOtroExamen,
      generadoEn: ahora,
      expiraEn: finExamen,
    },
  });

  // QR 7: Firma Falsa (Escenario 12: estudiante Felipe Arancibia 202400006, habilitado sin ingreso previo, pero token firmado con clave espuria)
  const fakeJwtService = new JwtService({
    secret: 'clave-falsa-no-autorizada',
  });
  const tokenFirmaFalsa = fakeJwtService.sign({
    sub: est6.id,
    codSis: est6.cod_sis,
    examenId: examenActivo.id,
    qrVersion: 1,
    jti: randomUUID(),
    tipo: 'examen',
    iat: Math.floor(ahora.getTime() / 1000),
    exp: Math.floor(finExamen.getTime() / 1000),
  });

  // QR 8: Texto que NO es un QR válido (Escenario 6)
  const textoNoQr =
    'https://www.umss.edu.bo/portal-noticias/comunicado-oficial?id=482';

  // 8. Generar imágenes QR DataURL
  const qrValido1Data = await QRCode.toDataURL(tokenValido1, {
    width: 260,
    margin: 2,
  });
  const qrValido2Data = await QRCode.toDataURL(tokenValido2, {
    width: 260,
    margin: 2,
  });
  const qrDuplicadoData = qrValido1Data; // Mismo QR 1 para probar doble escaneo
  const qrInhabilitadoData = await QRCode.toDataURL(tokenInhabilitado, {
    width: 260,
    margin: 2,
  });
  const qrVencidoData = await QRCode.toDataURL(tokenVencido, {
    width: 260,
    margin: 2,
  });
  const qrRevocadoData = await QRCode.toDataURL(tokenRevocado, {
    width: 260,
    margin: 2,
  });
  const qrOtroExamenData = await QRCode.toDataURL(tokenOtroExamen, {
    width: 260,
    margin: 2,
  });
  const qrFirmaFalsaData = await QRCode.toDataURL(tokenFirmaFalsa, {
    width: 260,
    margin: 2,
  });
  const qrTextoNoQrData = await QRCode.toDataURL(textoNoQr, {
    width: 260,
    margin: 2,
  });

  // 9. Generar HTML interactivo con grilla completa
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Códigos QR de Prueba - ExaControl Offline & Online</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1120; color: #f8fafc; margin: 0; padding: 24px; line-height: 1.5; }
    header { text-align: center; margin-bottom: 24px; }
    h1 { color: #38bdf8; margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    p.subtitle { color: #94a3b8; font-size: 14px; margin: 0; }
    
    .info-bar { max-width: 1200px; margin: 0 auto 24px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px 20px; font-size: 13px; color: #cbd5e1; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
    .info-bar strong { color: #f1f5f9; }
    .info-bar code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 12px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; max-width: 1360px; margin: 0 auto; }
    .card { background: #151f32; border-radius: 14px; padding: 18px; border: 1px solid #1e293b; display: flex; flex-direction: column; align-items: center; text-align: center; transition: transform 0.15s, border-color 0.15s; }
    .card:hover { transform: translateY(-3px); border-color: #38bdf8; }
    
    .badge-bar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; justify-content: center; }
    .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.5px; }
    .badge.green { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .badge.red { background: #450a0a; color: #f87171; border: 1px solid #dc2626; }
    .badge.amber { background: #451a03; color: #fbbf24; border: 1px solid #d97706; }
    .badge.blue { background: #0c4a6e; color: #38bdf8; border: 1px solid #0284c7; }
    .badge.purple { background: #3b0764; color: #c084fc; border: 1px solid #9333ea; }

    .card h3 { margin: 0 0 4px 0; font-size: 15px; color: #f1f5f9; font-weight: 700; }
    .card p.desc { font-size: 12px; color: #94a3b8; margin: 0 0 12px 0; min-height: 36px; }
    
    .qr-container { background: #ffffff; padding: 8px; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
    .qr-container img { display: block; width: 190px; height: 190px; }

    .expectations { width: 100%; display: flex; flex-direction: column; gap: 6px; font-size: 11px; text-align: left; }
    .exp-row { padding: 6px 10px; border-radius: 6px; border: 1px solid #1e293b; background: #0b1120; }
    .exp-row strong { display: inline-block; width: 55px; }
    .exp-online strong { color: #34d399; }
    .exp-offline strong { color: #fbbf24; }
  </style>
</head>
<body>
  <header>
    <h1>ExaControl – Banco de Códigos QR para Pruebas</h1>
    <p class="subtitle">Validación de Escenarios de Control de Ingreso (Online / Offline / Sincronización)</p>
  </header>

  <div class="info-bar">
    <div>
      <strong>Examen Activo:</strong> ${examenActivo.tipoExamen} (ID: <code>${examenActivo.id}</code>)<br>
      <strong>Ambiente:</strong> ${examenActivo.reservaAmbiente?.ambiente?.nombre || 'Laboratorio Informática 1'}<br>
      <strong>Estado:</strong> <span style="color:#34d399;font-weight:bold;">EN_CURSO (Activo)</span>
    </div>
    <div>
      <strong>Colaboradores Asignados (Pass: <code>Control123*</code>):</strong><br>
      • <code>control.prueba1@umss.edu</code><br>
      • <code>control.prueba2@umss.edu</code><br>
      • <code>control.prueba3@umss.edu</code>
    </div>
    <div>
      <strong>Colaborador NO Asignado (Escenario 22):</strong><br>
      • <code>control.noasignado@umss.edu</code> (Pass: <code>Control123*</code>)<br>
      <strong>Estudiante Habilitado SIN QR (Escenario 7):</strong><br>
      • SIS: <code>202400003</code> (Lucía Mendoza Soliz)
    </div>
  </div>

  <div class="grid">
    <!-- 1. QR Válido 1 -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge green">Escenario 1 & 2</span>
        <span class="badge blue">Habilitado</span>
      </div>
      <h3>1. QR Válido – Estudiante 1</h3>
      <p class="desc">Carlos Gutiérrez Arze (SIS: 202400001, CI: 10000001). Estudiante habilitado con QR vigente.</p>
      <div class="qr-container"><img src="${qrValido1Data}" alt="QR Valido 1"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Ingreso inmediato (200 OK, badge verde).</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Ingreso provisional pendiente ("Modo offline 1 pend."). Sincroniza al volver internet.</div>
      </div>
    </div>

    <!-- 2. QR Válido 2 -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge green">Escenario 1 & 2</span>
        <span class="badge blue">Habilitado</span>
      </div>
      <h3>2. QR Válido – Estudiante 2</h3>
      <p class="desc">Mariana Vargas Mercado (SIS: 202400002, CI: 10000002). Segundo estudiante habilitado.</p>
      <div class="qr-container"><img src="${qrValido2Data}" alt="QR Valido 2"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Ingreso inmediato (200 OK, badge verde).</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Ingreso provisional pendiente. Al volver conexión se confirma.</div>
      </div>
    </div>

    <!-- 3. QR Duplicado -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge red">Escenario 3 & 16</span>
        <span class="badge amber">Doble Marcación</span>
      </div>
      <h3>3. QR Duplicado (Reingreso)</h3>
      <p class="desc">Mismo QR de Carlos Gutiérrez (202400001). Escanéalo por segunda vez después del QR #1.</p>
      <div class="qr-container"><img src="${qrDuplicadoData}" alt="QR Duplicado"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado: 409 "Ya registró su ingreso". Registra incidencia DOBLE_MARCACION.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Incidencia inmediata "Doble marcación". No se crea 2do ingreso ni fila duplicada.</div>
      </div>
    </div>

    <!-- 4. QR Inhabilitado -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge red">Escenario 4 & 20</span>
        <span class="badge red">No Habilitado</span>
      </div>
      <h3>4. Estudiante No Habilitado</h3>
      <p class="desc">Roberto Morales Rojas (SIS: 202400004). Inhabilitado por falta de matrícula y pagos.</p>
      <div class="qr-container"><img src="${qrInhabilitadoData}" alt="QR Inhabilitado"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado 400 con motivo: "Inhabilitado por falta...". Incidencia NO_HABILITADO.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Incidencia inmediata "No habilitado" consultando la nómina local. Sin ingreso.</div>
      </div>
    </div>

    <!-- 5. QR Vencido -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge amber">Escenario 5</span>
        <span class="badge red">QR Caducado</span>
      </div>
      <h3>5. QR Expirado / Vencido</h3>
      <p class="desc">Token emitido para examen pero con fecha de expiración hace 2 horas.</p>
      <div class="qr-container"><img src="${qrVencidoData}" alt="QR Vencido"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado 400: "El código QR presentado ha expirado". Incidencia QR_CADUCADO.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Detectado localmente por exp. Incidencia "QR caducado" en cola. Sin ingreso.</div>
      </div>
    </div>

    <!-- 6. QR Revocado -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge purple">Escenario 11</span>
        <span class="badge amber">Revocado en Servidor</span>
      </div>
      <h3>6. QR Revocado (Versión Antigua)</h3>
      <p class="desc">Alejandra Pinto (SIS: 202400005). Token emitido con qrVersion=1; estudiante tiene qrVersion=2 en DB.</p>
      <div class="qr-container"><img src="${qrRevocadoData}" alt="QR Revocado"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado 400: "Código QR revocado...". Incidencia QR_CADUCADO.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Aceptado provisional; al volver internet el servidor lo convierte en incidencia y rechaza el ingreso.</div>
      </div>
    </div>

    <!-- 7. QR de Otro Examen -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge amber">Examen Distinto</span>
        <span class="badge blue">ID Secundario</span>
      </div>
      <h3>7. QR de Otro Examen</h3>
      <p class="desc">Token emitido para el Examen Secundario (ID: ${examenSecundario.id}).</p>
      <div class="qr-container"><img src="${qrOtroExamenData}" alt="QR Otro Examen"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado 400: "El estudiante no figura en la nómina de este examen".</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Rechazado por examenId: "Corresponde a otro examen". Incidencia NO_HABILITADO.</div>
      </div>
    </div>

    <!-- 8. Firma Falsa -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge red">Escenario 12</span>
        <span class="badge red">Firma Falsa</span>
      </div>
      <h3>8. QR con Firma Falsa</h3>
      <p class="desc">Felipe Arancibia Siles (SIS: 202400006). Estudiante habilitado sin ingreso previo, token adulterado con clave espuria.</p>
      <div class="qr-container"><img src="${qrFirmaFalsaData}" alt="QR Firma Falsa"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Rechazado: firma no válida. Incidencia NO_ENCONTRADO.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Aceptado provisionalmente (estudiante habilitado); al sincronizar, el servidor crea incidencia "QR no válido" y lo rechaza.</div>
      </div>
    </div>

    <!-- 9. Texto No QR -->
    <div class="card">
      <div class="badge-bar">
        <span class="badge red">Escenario 6</span>
        <span class="badge amber">Texto Genérico</span>
      </div>
      <h3>9. Texto que NO es un QR Válido</h3>
      <p class="desc">Código QR que contiene una URL común o texto que no es formato JWT ExaControl.</p>
      <div class="qr-container"><img src="${qrTextoNoQrData}" alt="Texto No QR"></div>
      <div class="expectations">
        <div class="exp-row exp-online"><strong>Online:</strong> Diálogo "QR no válido" al instante. Sin ingreso ni incidencia.</div>
        <div class="exp-row exp-offline"><strong>Offline:</strong> Diálogo "QR no válido" al instante. Sin ingreso ni incidencia.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const htmlPath = path.resolve(__dirname, '../../qrs-prueba.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`📄 Página interactiva de QRs generada en: ${htmlPath}`);
  console.log('🎉 Seed de prueba completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
