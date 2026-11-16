/* eslint-disable no-console */
/**
 * Seed Integral de Escenarios QR y Partición Offline / Online
 *
 * Configura:
 * 1. Examen 1 (Bases de Datos I) en estado EN_CURSO con horario todo el día.
 * 2. Dos controladores asignados:
 *    - Luciana Pedraza: luciana.control@umss.edu.bo (Fila A - L)
 *    - Fernando Aguilar: fernando.control@umss.edu.bo (Fila M - Z)
 * 3. 10 estudiantes distribuidos equitativamente para activar la partición:
 *    - 5 en Fila A - L (4 habilitados, 1 inhabilitada)
 *    - 5 en Fila M - Z (5 habilitados)
 *    - 1 estudiante de OTRO examen
 * 4. Tokens JWT válidos firmados y generación de QRs en PNG e HTML interactivo.
 */
import { PrismaClient, EstadoExamen } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const QR_SECRET = process.env.QR_SECRET || 'dev-qr-secret';
const jwtService = new JwtService({ secret: QR_SECRET });

async function main() {
  console.log('============================================================');
  console.log('🚀 Iniciando Seed de Escenarios QR y Partición de Filas');
  console.log('============================================================');

  // 1. Obtener docente Vladimir
  const vladimir = await prisma.usuario.findFirst({
    where: { correo: 'vl.costas@umss.edu.bo' },
  });
  if (!vladimir) {
    throw new Error(
      'No se encontró al docente Vladimir Costas (vl.costas@umss.edu.bo)',
    );
  }

  // 2. Horario todo el día y Examen 1 EN_CURSO
  let horarioCompleto = await prisma.horarioFijo.findFirst({
    where: { periodoNombre: 'Jornada Completa (Pruebas)' },
  });
  if (!horarioCompleto) {
    horarioCompleto = await prisma.horarioFijo.create({
      data: {
        periodoNombre: 'Jornada Completa (Pruebas)',
        horaIni: new Date('1970-01-01T00:00:00.000Z'),
        horaFin: new Date('1970-01-01T23:59:59.000Z'),
      },
    });
  }

  const hoy = new Date();
  const examen = await prisma.examen.findUnique({
    where: { id: 1 },
    include: { reservaAmbiente: true },
  });
  if (!examen) throw new Error('No se encontró el Examen ID 1');

  if (examen.reservaAmbienteId) {
    await prisma.reservaAmbiente.update({
      where: { id: examen.reservaAmbienteId },
      data: {
        fecha: hoy,
        horarioFijoId: horarioCompleto.id,
      },
    });
  }

  await prisma.examen.update({
    where: { id: 1 },
    data: { estado: EstadoExamen.EN_CURSO },
  });
  console.log('✓ Examen 1 activo y EN_CURSO para el día de hoy');

  // 3. Crear / Asegurar Rol de Control
  let rolControl = await prisma.rol.findFirst({
    where: {
      nombre: {
        in: ['Personal de Control', 'Controlador', 'Colaborador'],
        mode: 'insensitive',
      },
    },
  });
  if (!rolControl) {
    rolControl = await prisma.rol.findFirst({
      where: { nombre: 'Estudiante' },
    });
  }

  // 4. Crear los dos controladores
  const passwordHash = await bcrypt.hash('Test1234!', 10);

  const luciana = await prisma.usuario.upsert({
    where: { correo: 'luciana.control@umss.edu.bo' },
    update: {
      password: passwordHash,
      debeCambiarPassword: false,
      debeConfigurarPerfil: false,
    },
    create: {
      correo: 'luciana.control@umss.edu.bo',
      password: passwordHash,
      nombre: 'Luciana',
      apellido: 'Pedraza Arze',
      debeCambiarPassword: false,
      debeConfigurarPerfil: false,
      roles: rolControl ? { create: { rolId: rolControl.id } } : undefined,
    },
  });

  const fernando = await prisma.usuario.upsert({
    where: { correo: 'fernando.control@umss.edu.bo' },
    update: {
      password: passwordHash,
      debeCambiarPassword: false,
      debeConfigurarPerfil: false,
    },
    create: {
      correo: 'fernando.control@umss.edu.bo',
      password: passwordHash,
      nombre: 'Fernando',
      apellido: 'Aguilar Rojas',
      debeCambiarPassword: false,
      debeConfigurarPerfil: false,
      roles: rolControl ? { create: { rolId: rolControl.id } } : undefined,
    },
  });

  // 1. Limpiar controladores previos del Examen 1 para que queden EXACTAMENTE 2 (Luciana y Fernando)
  await prisma.examenControlador.deleteMany({
    where: { examenId: 1 },
  });

  // Asignar Luciana (Lista A) y Fernando (Lista B) a Examen 1
  await prisma.examenControlador.create({
    data: {
      examenId: 1,
      colaboradorId: luciana.id,
      asignadoPor: vladimir.id,
      rolAsignacion: 'Control principal',
    },
  });

  await prisma.examenControlador.create({
    data: {
      examenId: 1,
      colaboradorId: fernando.id,
      asignadoPor: vladimir.id,
      rolAsignacion: 'Control principal',
    },
  });
  console.log('✓ 2 Controladores asignados a Examen 1:');
  console.log(
    `   - Luciana Pedraza:  luciana.control@umss.edu.bo  (Pass: Test1234!)`,
  );
  console.log(
    `   - Fernando Aguilar: fernando.control@umss.edu.bo (Pass: Test1234!)`,
  );

  // 4. Limpiar inscripciones previas de prueba en Examen 1 para balancear exactamente A-L y M-Z
  await prisma.ingreso.deleteMany({ where: { examenId: 1 } });
  await prisma.incidenciaIngreso.deleteMany({ where: { examenId: 1 } });
  await prisma.expulsion.deleteMany({ where: { examenId: 1 } });
  await prisma.codigoQr.deleteMany({ where: { examenId: 1 } });
  await prisma.examen_Estudiante.deleteMany({ where: { examenId: 1 } });

  // 5. Estudiantes ordenados por apellido para garantizar partición exacta A-L y M-Z
  const estudiantesData = [
    // --- LISTA A (A - L): Asignados a Luciana (5 habilitados, 1 inhabilitada) ---
    {
      cod_sis: '202401001',
      ci: '10000001',
      nombre: 'Alejandro',
      apellido: 'Alvarez Castro',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401002',
      ci: '10000002',
      nombre: 'Camila',
      apellido: 'Blanco Rios',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401003',
      ci: '10000003',
      nombre: 'Diego',
      apellido: 'Flores Mamani',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401004',
      ci: '10000004',
      nombre: 'Elena',
      apellido: 'Gomez Vargas',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401011',
      ci: '10000011',
      nombre: 'Andres',
      apellido: 'Lima Bernal',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401005',
      ci: '10000005',
      nombre: 'Beatriz',
      apellido: 'Fernandez Lopez',
      habilitado: false,
      motivo: 'Cuota de laboratorio pendiente',
    },

    // --- LISTA B (M - Z): Asignados a Fernando (5 habilitados) ---
    {
      cod_sis: '202401006',
      ci: '10000006',
      nombre: 'Carlos',
      apellido: 'Mamani Quispe',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401007',
      ci: '10000007',
      nombre: 'Natalia',
      apellido: 'Perez Soto',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401008',
      ci: '10000008',
      nombre: 'Rodrigo',
      apellido: 'Rojas Siles',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401009',
      ci: '10000009',
      nombre: 'Roberto',
      apellido: 'Villarroel Rocha',
      habilitado: true,
      motivo: null,
    },
    {
      cod_sis: '202401010',
      ci: '10000010',
      nombre: 'Valeria',
      apellido: 'Zapata Cruz',
      habilitado: true,
      motivo: null,
    },
  ];

  // Estudiante de OTRO examen
  const estudianteOtroExamen = {
    cod_sis: '202401099',
    ci: '99999999',
    nombre: 'Mateo',
    apellido: 'Torrez Ortega',
    habilitado: true,
    motivo: null,
  };

  const dirQrs = path.resolve(__dirname, '../../Frontend/public/qrs_offline');
  if (!fs.existsSync(dirQrs)) {
    fs.mkdirSync(dirQrs, { recursive: true });
  }

  const listaEscenarios: Array<{
    id: number;
    nombre: string;
    codSis: string;
    ci: string;
    filaEsperada: string;
    controladorValido: string;
    resultadoLuciana: string;
    resultadoFernando: string;
    estadoHabilitado: boolean;
    motivoInhabilitacion?: string | null;
    qrFile: string;
    qrDataUri: string;
    token: string;
    tagClass: string;
  }> = [];

  for (const item of estudiantesData) {
    const est = await prisma.estudiante.upsert({
      where: { cod_sis: item.cod_sis },
      update: {
        nombre: item.nombre,
        apellido: item.apellido,
        ci: item.ci,
        qrVersion: 1,
      },
      create: {
        cod_sis: item.cod_sis,
        ci: item.ci,
        nombre: item.nombre,
        apellido: item.apellido,
        qrVersion: 1,
      },
    });

    // Inscribir en Examen 1
    await prisma.examen_Estudiante.upsert({
      where: {
        estudianteId_examenId: {
          estudianteId: est.id,
          examenId: 1,
        },
      },
      update: {
        estado_habilitado: item.habilitado,
        motivo_inhabilitacion: item.motivo,
      },
      create: {
        estudianteId: est.id,
        examenId: 1,
        estado_habilitado: item.habilitado,
        motivo_inhabilitacion: item.motivo,
      },
    });

    // Eliminar ingreso previo para que esté listo para ser escaneado
    await prisma.ingreso.deleteMany({
      where: { estudianteId: est.id, examenId: 1 },
    });

    // Asegurar FotoEstudiante activa para previsualización y reconocimiento
    await prisma.fotoEstudiante.deleteMany({
      where: { estudianteId: est.id },
    });
    await prisma.fotoEstudiante.create({
      data: {
        estudianteId: est.id,
        archivo: `/uploads/estudiantes/foto_${item.cod_sis}.jpg`,
        hashSha256: `hash_${item.cod_sis}`,
        estado: 'ACTIVA',
      },
    });

    // Asegurar archivo físico en disco para que no dé 404 y se descargue limpiamente en caché offline
    const uploadsDir = path.resolve(__dirname, '../uploads/estudiantes');
    const seedPhotosDir = path.resolve(__dirname, 'seed-photos');
    const targetPhoto = path.join(uploadsDir, `foto_${item.cod_sis}.jpg`);
    const seedPhoto = path.join(seedPhotosDir, `foto_${item.cod_sis}.jpg`);
    const samplePhoto = path.join(
      uploadsDir,
      '486f4563-ce0c-4332-83aa-8ada6be1d950.jpg',
    );

    try {
      if (fs.existsSync(seedPhoto)) {
        fs.copyFileSync(seedPhoto, targetPhoto);
      } else if (fs.existsSync(samplePhoto) && !fs.existsSync(targetPhoto)) {
        fs.copyFileSync(samplePhoto, targetPhoto);
      }
    } catch (e) {
      void e;
    }

    // Generar Token JWT firmado válido
    const token = jwtService.sign(
      {
        sub: est.id,
        codSis: est.cod_sis,
        examenId: 1,
        qrVersion: 1,
        tipo: 'examen',
      },
      { expiresIn: '7d' },
    );

    // Limpiar QRs previos del estudiante y guardar nuevo código QR activo
    await prisma.codigoQr.deleteMany({
      where: { estudianteId: est.id, examenId: 1 },
    });
    await prisma.codigoQr.create({
      data: {
        token,
        estudianteId: est.id,
        generadoEn: new Date(),
        expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tipo: 'examen',
        examenId: 1,
      },
    });

    // Generar Data URI inline y archivo PNG del QR
    const qrFileName = `qr_${item.cod_sis}.png`;
    const qrFilePath = path.join(dirQrs, qrFileName);
    const qrDataUri = await QRCode.toDataURL(token, {
      width: 400,
      margin: 2,
      color: { dark: '#002D62', light: '#FFFFFF' },
    });
    await QRCode.toFile(qrFilePath, token, {
      width: 400,
      margin: 2,
      color: { dark: '#002D62', light: '#FFFFFF' },
    });

    const esFilaA = item.apellido.charAt(0).toUpperCase() <= 'L';
    const fila = esFilaA ? 'Lista A (A - L)' : 'Lista B (M - Z)';
    const ctrlValido = esFilaA ? 'Luciana' : 'Fernando';

    let resLuciana = '';
    let resFernando = '';

    if (!item.habilitado) {
      resLuciana = '❌ RECHAZADO: No Habilitado';
      resFernando = '❌ RECHAZADO: No Habilitado';
    } else if (esFilaA) {
      resLuciana = '✅ ACEPTADO (En su fila)';
      resFernando = '⚠️ RECHAZADO: Fila incorrecta (FUERA_DE_GRUPO)';
    } else {
      resLuciana = '⚠️ RECHAZADO: Fila incorrecta (FUERA_DE_GRUPO)';
      resFernando = '✅ ACEPTADO (En su fila)';
    }

    listaEscenarios.push({
      id: est.id,
      nombre: `${item.nombre} ${item.apellido}`,
      codSis: item.cod_sis,
      ci: item.ci,
      filaEsperada: fila,
      controladorValido: ctrlValido,
      resultadoLuciana: resLuciana,
      resultadoFernando: resFernando,
      estadoHabilitado: item.habilitado,
      motivoInhabilitacion: item.motivo,
      qrFile: qrFileName,
      qrDataUri,
      token,
      tagClass: !item.habilitado
        ? 'inhabilitado'
        : esFilaA
          ? 'fila-a'
          : 'fila-b',
    });
  }

  // Estudiante de otro examen
  const estOtro = await prisma.estudiante.upsert({
    where: { cod_sis: estudianteOtroExamen.cod_sis },
    update: {
      nombre: estudianteOtroExamen.nombre,
      apellido: estudianteOtroExamen.apellido,
      ci: estudianteOtroExamen.ci,
      qrVersion: 1,
    },
    create: {
      cod_sis: estudianteOtroExamen.cod_sis,
      ci: estudianteOtroExamen.ci,
      nombre: estudianteOtroExamen.nombre,
      apellido: estudianteOtroExamen.apellido,
      qrVersion: 1,
    },
  });

  // Quitarlo del Examen 1 si estuviera
  await prisma.examen_Estudiante.deleteMany({
    where: { estudianteId: estOtro.id, examenId: 1 },
  });

  // Asegurar foto para estudiante de otro examen
  await prisma.fotoEstudiante.deleteMany({
    where: { estudianteId: estOtro.id },
  });
  await prisma.fotoEstudiante.create({
    data: {
      estudianteId: estOtro.id,
      archivo: `/uploads/estudiantes/foto_${estOtro.cod_sis}.jpg`,
      hashSha256: `hash_${estOtro.cod_sis}`,
      estado: 'ACTIVA',
    },
  });

  const uploadsDir = path.resolve(__dirname, '../uploads/estudiantes');
  const seedPhotosDir = path.resolve(__dirname, 'seed-photos');
  const targetOtroPhoto = path.join(uploadsDir, `foto_${estOtro.cod_sis}.jpg`);
  const seedOtroPhoto = path.join(seedPhotosDir, `foto_${estOtro.cod_sis}.jpg`);
  try {
    if (fs.existsSync(seedOtroPhoto)) {
      fs.copyFileSync(seedOtroPhoto, targetOtroPhoto);
    }
  } catch (e) {
    void e;
  }

  const tokenOtro = jwtService.sign(
    { sub: estOtro.id, codSis: estOtro.cod_sis, examenId: 999, tipo: 'examen' },
    { expiresIn: '7d' },
  );

  const qrOtroFile = `qr_${estOtro.cod_sis}_otro_examen.png`;
  const qrOtroDataUri = await QRCode.toDataURL(tokenOtro, {
    width: 400,
    margin: 2,
    color: { dark: '#991B1B', light: '#FFFFFF' },
  });
  await QRCode.toFile(path.join(dirQrs, qrOtroFile), tokenOtro, {
    width: 400,
    margin: 2,
    color: { dark: '#991B1B', light: '#FFFFFF' },
  });

  listaEscenarios.push({
    id: estOtro.id,
    nombre: `${estudianteOtroExamen.nombre} ${estudianteOtroExamen.apellido}`,
    codSis: estudianteOtroExamen.cod_sis,
    ci: estudianteOtroExamen.ci,
    filaEsperada: 'No figura en este examen',
    controladorValido: 'Ninguno (Otro Examen)',
    resultadoLuciana: '❌ RECHAZADO: No figura en nómina',
    resultadoFernando: '❌ RECHAZADO: No figura en nómina',
    estadoHabilitado: false,
    motivoInhabilitacion: 'Inscrito en otra materia/examen',
    qrFile: qrOtroFile,
    qrDataUri: qrOtroDataUri,
    token: tokenOtro,
    tagClass: 'otro-examen',
  });

  console.log(
    `✓ ${listaEscenarios.length} Escenarios QR generados en carpeta: Frontend/public/qrs_offline/`,
  );

  // 6. Generar Dashboard HTML interactivo
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard de Pruebas Offline - Partición de Filas QR</title>
  <style>
    :root {
      --primary: #002D62;
      --primary-dark: #001D42;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
      --success: #059669;
      --warning: #D97706;
      --danger: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: #1E293B; padding: 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    header { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 28px; rounded-2xl; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0, 45, 98, 0.2); }
    header h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    header p { opacity: 0.9; font-size: 14px; max-width: 800px; }
    
    .controllers-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .ctrl-card { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .ctrl-card h3 { font-size: 16px; font-weight: 700; color: var(--primary); display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .ctrl-badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 700; }
    .badge-a { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .badge-b { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
    .ctrl-cred { font-size: 13px; color: #64748B; background: #F1F5F9; padding: 8px 12px; border-radius: 8px; margin-top: 8px; font-family: monospace; }

    .instructions { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #92400E; }
    .instructions h4 { font-weight: 800; margin-bottom: 6px; }
    .instructions ol { margin-left: 20px; }
    .instructions li { margin-bottom: 4px; }

    .filter-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab-btn { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .tab-btn.active, .tab-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

    .grid-qrs { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
    .qr-card { background: white; border: 1px solid var(--border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); transition: transform 0.2s, box-shadow 0.2s; }
    .qr-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.06); }
    
    .qr-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .qr-name { font-size: 16px; font-weight: 800; color: #0F172A; }
    .qr-sis { font-size: 12px; color: #64748B; font-family: monospace; margin-top: 2px; }
    .tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
    .tag.fila-a { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .tag.fila-b { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
    .tag.inhabilitado { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
    .tag.otro-examen { background: #FDF2F8; color: #9D174D; border: 1px solid #FBCFE8; }

    .qr-img-wrapper { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 12px; display: flex; justify-content: center; align-items: center; }
    .qr-img { width: 220px; height: 220px; object-fit: contain; border-radius: 8px; }

    .scenarios-box { background: #F8FAFC; border-radius: 12px; padding: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 6px; border: 1px solid #EEF2F6; }
    .scenario-row { display: flex; justify-content: space-between; align-items: center; }
    .scenario-ctrl { font-weight: 700; color: #475569; }
    .res-accepted { color: var(--success); font-weight: 700; }
    .res-rejected { color: var(--warning); font-weight: 700; }
    .res-danger { color: var(--danger); font-weight: 700; }

    .btn-copy { background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.15s; }
    .btn-copy:hover { background: #E2E8F0; color: #0F172A; }
    .btn-copy:active { transform: scale(0.98); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 Dashboard de Pruebas Offline: Partición de Filas y Sincronización</h1>
      <p>Simulador interactivo con códigos QR de prueba para validar que cada controlador solo admita su fila asignada tanto en modo offline como online, y comprobar la sincronización automática.</p>
    </header>

    <div class="controllers-bar">
      <div class="ctrl-card">
        <h3>
          <span>👤 Luciana Pedraza</span>
          <span class="ctrl-badge badge-a">Fila A – L (Lista A)</span>
        </h3>
        <p style="font-size: 13px; color: #475569;">Atiende estudiantes con primer apellido de la <b>A a la L</b>.</p>
        <div class="ctrl-cred">
          Email: <b>luciana.control@umss.edu.bo</b><br>
          Password: <b>Test1234!</b>
        </div>
      </div>

      <div class="ctrl-card">
        <h3>
          <span>👤 Fernando Aguilar</span>
          <span class="ctrl-badge badge-b">Fila M – Z (Lista B)</span>
        </h3>
        <p style="font-size: 13px; color: #475569;">Atiende estudiantes con primer apellido de la <b>M a la Z</b>.</p>
        <div class="ctrl-cred">
          Email: <b>fernando.control@umss.edu.bo</b><br>
          Password: <b>Test1234!</b>
        </div>
      </div>
    </div>

    <div class="instructions">
      <h4>📋 Guía para probar el Flujo Offline & Sincronización:</h4>
      <ol>
        <li>Inicia sesión con <b>Fernando</b> (<code>fernando.control@umss.edu.bo</code>). Verás arriba el banner <b>Fila M – Z</b>.</li>
        <li>Deja que cargue el examen activo (para que guarde la nómina y su fila en caché offline).</li>
        <li>Abre DevTools (<code>F12</code>) &rarr; pestaña <b>Network</b> &rarr; cambia <i>No throttling</i> a <b>Offline</b>.</li>
        <li><b>Prueba de rechazo:</b> Escanea el QR de <b>Alejandro Alvarez (Fila A - L)</b>. Verás la alerta: <i>"Fila incorrecta: Debe dirigirse a Luciana"</i>.</li>
        <li><b>Prueba de éxito:</b> Escanea el QR de <b>Carlos Mamani (Fila M - Z)</b>. Confirma el ingreso: se guardará sin conexión (1 pendiente).</li>
        <li><b>Prueba de sincronización:</b> En DevTools vuelve a activar internet (<b>No throttling</b>). Verás cómo sincroniza en lote automáticamente con el backend.</li>
      </ol>
    </div>

    <!-- Barra de reinicio completo de memoria local de pruebas -->
    <div style="background: white; border: 2px dashed #EF4444; border-radius: 16px; padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 6px -1px rgba(239,68,68,0.06);">
      <div style="max-width: 700px;">
        <h4 style="color: #991B1B; font-weight: 800; font-size: 15px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <span>🧹</span> ¿Quieres reiniciar tus pruebas desde cero?
        </h4>
        <p style="color: #64748B; font-size: 13px; line-height: 1.4;">
          Limpia en un clic los ingresos previos de prueba guardados en la memoria local (localStorage e IndexedDB de este navegador) para que los QRs vuelvan a estar 100% listos para escanear sin que te diga "ya registrado".
        </p>
      </div>
      <button id="btnLimpiarMemoria" onclick="limpiarMemoriaPruebas()" style="background: #DC2626; color: white; border: none; padding: 12px 22px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 13px; box-shadow: 0 2px 4px rgba(220,38,38,0.2);">
        🗑️ Limpiar Memoria Local y Caché
      </button>
    </div>

    <div class="filter-tabs">
      <button class="tab-btn active" onclick="filtrar('todos')">Todos (${listaEscenarios.length})</button>
      <button class="tab-btn" onclick="filtrar('fila-a')">Lista A: A - L (${listaEscenarios.filter((e) => e.tagClass === 'fila-a').length})</button>
      <button class="tab-btn" onclick="filtrar('fila-b')">Lista B: M - Z (${listaEscenarios.filter((e) => e.tagClass === 'fila-b').length})</button>
      <button class="tab-btn" onclick="filtrar('inhabilitado')">Inhabilitados (1)</button>
      <button class="tab-btn" onclick="filtrar('otro-examen')">Otro Examen (1)</button>
    </div>

    <div class="grid-qrs" id="contenedorQrs">
      ${listaEscenarios
        .map(
          (esc) => `
        <div class="qr-card" data-cat="${esc.tagClass}">
          <div class="qr-header">
            <div>
              <div class="qr-name">${esc.nombre}</div>
              <div class="qr-sis">SIS: ${esc.codSis} · CI: ${esc.ci}</div>
            </div>
            <span class="tag ${esc.tagClass}">${esc.filaEsperada}</span>
          </div>

          <div class="qr-img-wrapper">
            <img class="qr-img" src="${esc.qrDataUri}" alt="QR ${esc.nombre}">
          </div>

          <div class="scenarios-box">
            <div class="scenario-row">
              <span class="scenario-ctrl">Con Luciana (A - L):</span>
              <span class="${
                esc.resultadoLuciana.includes('ACEPTADO')
                  ? 'res-accepted'
                  : esc.resultadoLuciana.includes('FUERA_DE_GRUPO')
                    ? 'res-rejected'
                    : 'res-danger'
              }">${esc.resultadoLuciana}</span>
            </div>
            <div class="scenario-row">
              <span class="scenario-ctrl">Con Fernando (M - Z):</span>
              <span class="${
                esc.resultadoFernando.includes('ACEPTADO')
                  ? 'res-accepted'
                  : esc.resultadoFernando.includes('FUERA_DE_GRUPO')
                    ? 'res-rejected'
                    : 'res-danger'
              }">${esc.resultadoFernando}</span>
            </div>
          </div>

          <button class="btn-copy" onclick="copiarToken('${esc.token}', this)">
            📋 Copiar Token QR
          </button>
        </div>
      `,
        )
        .join('')}
    </div>
  </div>

  <script>
    function filtrar(cat) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      const cards = document.querySelectorAll('.qr-card');
      cards.forEach(card => {
        if (cat === 'todos' || card.dataset.cat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function copiarToken(token, btn) {
      navigator.clipboard.writeText(token).then(() => {
        const orig = btn.innerText;
        btn.innerText = '✅ Token copiado!';
        btn.style.backgroundColor = '#DCFCE7';
        btn.style.color = '#15803D';
        setTimeout(() => {
          btn.innerText = orig;
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 1500);
      });
    }
    async function limpiarMemoriaPruebas() {
      const btn = document.getElementById('btnLimpiarMemoria');
      btn.disabled = true;
      btn.innerText = '⏳ Limpiando memoria...';
      try {
        // 1. Limpiar localStorage de sullu
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sullu_') || k.includes('offline') || k.includes('ingreso') || k.includes('nomina'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // 2. Limpiar base IndexedDB sullu_db
        if (window.indexedDB) {
          await new Promise((res) => {
            const req = window.indexedDB.deleteDatabase('sullu_db');
            req.onsuccess = () => res();
            req.onerror = () => res();
            req.onblocked = () => res();
          });
        }

        // 3. Limpiar caches de Service Worker
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }

        btn.innerText = '✅ ¡Listo! Memoria limpiada';
        btn.style.backgroundColor = '#16A34A';
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err) {
        btn.disabled = false;
        btn.innerText = '❌ Error al limpiar';
      }
    }
  </script>
</body>
</html>`;

  const htmlDashboardPath = path.resolve(
    __dirname,
    '../../Frontend/public/qrs_offline/index.html',
  );
  const htmlRootPublicPath = path.resolve(
    __dirname,
    '../../Frontend/public/qrs-offline.html',
  );
  fs.writeFileSync(htmlDashboardPath, htmlContent, 'utf-8');
  fs.writeFileSync(htmlRootPublicPath, htmlContent, 'utf-8');

  console.log(`✓ Dashboard HTML generado en:`);
  console.log(`   - http://localhost:4000/qrs-offline.html`);
  console.log(`   - http://localhost:4000/qrs_offline/index.html`);
  console.log('============================================================');
  console.log('🎉 Seed completado exitosamente.');
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
