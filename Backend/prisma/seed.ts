/* eslint-disable no-console */
/**
 * Seed principal con datos reales de la UMSS (Universidad Mayor de San Simón).
 * Popula: Módulos, Permisos, Roles, Usuarios, Facultades, Carreras, Materias,
 *         Ambientes, Reservas, Exámenes, Estudiantes e Ingresos.
 *
 * Ejecutar:
 *   npm run seed:full
 *     o
 *   npx prisma db seed
 *
 * Formato de correo institucional docentes: inicial.apellido@umss.edu.bo
 * Contraseña de todos los usuarios de prueba: Test1234!
 */
import { PrismaClient, EstadoAula, EstadoExamen } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Test1234!';

// ============================================================
// 1. DATOS REALES UMSS
// ============================================================

const FACULTADES_DATA = [
  {
    nombre: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: [
      {
        nombre: 'Ingeniería de Sistemas',
        materias: [
          { sigla: 'ALG', nombre: 'Algoritmos y Programación' },
          { sigla: 'BD1', nombre: 'Bases de Datos I' },
          { sigla: 'BD2', nombre: 'Bases de Datos II' },
          { sigla: 'ISW1', nombre: 'Ingeniería de Software I' },
          { sigla: 'ISW2', nombre: 'Ingeniería de Software II' },
          { sigla: 'SO', nombre: 'Sistemas Operativos' },
          { sigla: 'REDES', nombre: 'Redes de Computadoras' },
          { sigla: 'IA1', nombre: 'Inteligencia Artificial I' },
          { sigla: 'CALCI', nombre: 'Cálculo I' },
          { sigla: 'CALCII', nombre: 'Cálculo II' },
          { sigla: 'ALG-LIN', nombre: 'Álgebra Lineal' },
          { sigla: 'PROB', nombre: 'Probabilidad y Estadística' },
        ],
      },
      {
        nombre: 'Ingeniería Informática',
        materias: [
          { sigla: 'PROG-F', nombre: 'Programación Funcional' },
          { sigla: 'PROG-W', nombre: 'Programación Web' },
          { sigla: 'SI1', nombre: 'Sistemas de Información I' },
          { sigla: 'SI2', nombre: 'Sistemas de Información II' },
          { sigla: 'IA2', nombre: 'Inteligencia Artificial II' },
          { sigla: 'CD', nombre: 'Ciencia de Datos' },
          { sigla: 'ML', nombre: 'Machine Learning' },
          { sigla: 'ARQ-SW', nombre: 'Arquitectura de Software' },
          { sigla: 'CALCI', nombre: 'Cálculo I' },
          { sigla: 'BD1', nombre: 'Bases de Datos I' },
        ],
      },
      {
        nombre: 'Ingeniería Civil',
        materias: [
          { sigla: 'EST1', nombre: 'Estática' },
          { sigla: 'DIN', nombre: 'Dinámica' },
          { sigla: 'HORMIG', nombre: 'Hormigón Armado' },
          { sigla: 'HIDRO', nombre: 'Hidráulica' },
          { sigla: 'SUELOS', nombre: 'Mecánica de Suelos' },
          { sigla: 'CALCI', nombre: 'Cálculo I' },
          { sigla: 'CALCII', nombre: 'Cálculo II' },
        ],
      },
      {
        nombre: 'Ingeniería Electrónica',
        materias: [
          { sigla: 'CIR1', nombre: 'Circuitos Eléctricos I' },
          { sigla: 'ELECT', nombre: 'Electrónica Analógica' },
          { sigla: 'DIGI', nombre: 'Electrónica Digital' },
          { sigla: 'MICRO', nombre: 'Microprocesadores' },
          { sigla: 'CTRL', nombre: 'Control Automático' },
        ],
      },
      {
        nombre: 'Ingeniería Química',
        materias: [
          { sigla: 'QIM-ORG', nombre: 'Química Orgánica' },
          { sigla: 'QIM-ING', nombre: 'Química Inorgánica' },
          { sigla: 'TERM', nombre: 'Termodinámica Química' },
          { sigla: 'OP-UNIT', nombre: 'Operaciones Unitarias' },
        ],
      },
    ],
    ambientes: [
      {
        nombre: 'Laboratorio Informática 1 (FCyT)',
        capacidad: 40,
        tipo: 'Laboratorio',
      },
      {
        nombre: 'Laboratorio Informática 2 (FCyT)',
        capacidad: 40,
        tipo: 'Laboratorio',
      },
      { nombre: 'Aula A-101 (FCyT)', capacidad: 60, tipo: 'Aula' },
      { nombre: 'Aula A-102 (FCyT)', capacidad: 60, tipo: 'Aula' },
      { nombre: 'Aula B-201 (FCyT)', capacidad: 80, tipo: 'Aula' },
      { nombre: 'Aula B-202 (FCyT)', capacidad: 80, tipo: 'Aula' },
      { nombre: 'Auditorio FCyT', capacidad: 200, tipo: 'Auditorio' },
    ],
  },
  {
    nombre: 'Facultad de Ciencias Económicas (FCE)',
    carreras: [
      {
        nombre: 'Administración de Empresas',
        materias: [
          { sigla: 'ADM1', nombre: 'Administración I' },
          { sigla: 'ADM2', nombre: 'Administración II' },
          { sigla: 'CONT1', nombre: 'Contabilidad General' },
          { sigla: 'MKTG', nombre: 'Fundamentos de Marketing' },
          { sigla: 'ECON-MICR', nombre: 'Microeconomía' },
          { sigla: 'ECON-MACR', nombre: 'Macroeconomía' },
          { sigla: 'FIN', nombre: 'Finanzas Empresariales' },
        ],
      },
      {
        nombre: 'Contaduría Pública',
        materias: [
          { sigla: 'CONT1', nombre: 'Contabilidad General' },
          { sigla: 'CONT2', nombre: 'Contabilidad de Costos' },
          { sigla: 'IMP', nombre: 'Tributación y Derecho Tributario' },
          { sigla: 'AUD', nombre: 'Auditoría Financiera' },
          { sigla: 'CONT-PUB', nombre: 'Contabilidad Gubernamental' },
        ],
      },
      {
        nombre: 'Economía',
        materias: [
          { sigla: 'ECON-MICR', nombre: 'Microeconomía' },
          { sigla: 'ECON-MACR', nombre: 'Macroeconomía' },
          { sigla: 'ECON-INT', nombre: 'Economía Internacional' },
          { sigla: 'MAT-ECO', nombre: 'Matemáticas para Economistas' },
          { sigla: 'ECON-DES', nombre: 'Economía del Desarrollo' },
        ],
      },
      {
        nombre: 'Ingeniería Comercial',
        materias: [
          { sigla: 'LOG', nombre: 'Logística y Cadena de Suministro' },
          { sigla: 'COM-INT', nombre: 'Comercio Internacional' },
          { sigla: 'MKTG', nombre: 'Fundamentos de Marketing' },
          { sigla: 'NEGOC', nombre: 'Negociación Empresarial' },
        ],
      },
    ],
    ambientes: [
      { nombre: 'Aula 101 (FCE)', capacidad: 70, tipo: 'Aula' },
      { nombre: 'Aula 102 (FCE)', capacidad: 70, tipo: 'Aula' },
      { nombre: 'Sala de Cómputo FCE', capacidad: 35, tipo: 'Laboratorio' },
      { nombre: 'Auditorio FCE', capacidad: 180, tipo: 'Auditorio' },
    ],
  },
  {
    nombre: 'Facultad de Humanidades y Ciencias de la Educación (FHCE)',
    carreras: [
      {
        nombre: 'Psicología',
        materias: [
          { sigla: 'PSI-GEN', nombre: 'Psicología General' },
          { sigla: 'PSI-SOC', nombre: 'Psicología Social' },
          { sigla: 'PSI-CLIN', nombre: 'Psicología Clínica' },
          { sigla: 'PSI-EDU', nombre: 'Psicología Educativa' },
          { sigla: 'NEURO', nombre: 'Neuropsicología' },
          { sigla: 'EVAL-PSI', nombre: 'Evaluación Psicológica' },
        ],
      },
      {
        nombre: 'Comunicación Social',
        materias: [
          { sigla: 'COM-TH', nombre: 'Teorías de la Comunicación' },
          { sigla: 'PERIOD', nombre: 'Periodismo Digital' },
          { sigla: 'PUBLI', nombre: 'Publicidad y Propaganda' },
          { sigla: 'RAD-TV', nombre: 'Producción Radial y Televisiva' },
        ],
      },
      {
        nombre: 'Ciencias de la Educación',
        materias: [
          { sigla: 'PED', nombre: 'Pedagogía General' },
          { sigla: 'DID', nombre: 'Didáctica' },
          { sigla: 'EVAL-EDU', nombre: 'Evaluación Educativa' },
          { sigla: 'CUR', nombre: 'Currículo y Planificación' },
        ],
      },
    ],
    ambientes: [
      { nombre: 'Aula 201 (FHCE)', capacidad: 50, tipo: 'Aula' },
      { nombre: 'Aula 202 (FHCE)', capacidad: 50, tipo: 'Aula' },
      {
        nombre: 'Laboratorio de Psicología (FHCE)',
        capacidad: 25,
        tipo: 'Laboratorio',
      },
    ],
  },
  {
    nombre: 'Facultad de Ciencias Jurídicas y Políticas (FCJP)',
    carreras: [
      {
        nombre: 'Derecho',
        materias: [
          { sigla: 'DER-CIV', nombre: 'Derecho Civil I' },
          { sigla: 'DER-PEN', nombre: 'Derecho Penal' },
          { sigla: 'DER-CON', nombre: 'Derecho Constitucional' },
          { sigla: 'DER-LAB', nombre: 'Derecho Laboral' },
          { sigla: 'DER-COM', nombre: 'Derecho Comercial' },
          { sigla: 'PROCE', nombre: 'Derecho Procesal Civil' },
        ],
      },
      {
        nombre: 'Ciencias Políticas',
        materias: [
          { sigla: 'POL-TH', nombre: 'Teoría Política' },
          { sigla: 'REL-INT', nombre: 'Relaciones Internacionales' },
          { sigla: 'POL-BOL', nombre: 'Política Boliviana' },
          { sigla: 'ADM-PUB', nombre: 'Administración Pública' },
        ],
      },
    ],
    ambientes: [
      { nombre: 'Aula 301 (FCJP)', capacidad: 90, tipo: 'Aula' },
      { nombre: 'Aula 302 (FCJP)', capacidad: 90, tipo: 'Aula' },
      {
        nombre: 'Sala de Simulación Jurídica (FCJP)',
        capacidad: 40,
        tipo: 'Laboratorio',
      },
    ],
  },
  {
    nombre: 'Facultad de Medicina (FM)',
    carreras: [
      {
        nombre: 'Medicina',
        materias: [
          { sigla: 'ANAT', nombre: 'Anatomía Humana' },
          { sigla: 'FISIOL', nombre: 'Fisiología' },
          { sigla: 'BIOQUIM', nombre: 'Bioquímica' },
          { sigla: 'PATOL', nombre: 'Patología General' },
          { sigla: 'FARMA', nombre: 'Farmacología' },
          { sigla: 'MED-INT', nombre: 'Medicina Interna' },
        ],
      },
    ],
    ambientes: [
      { nombre: 'Aula Magna FM', capacidad: 300, tipo: 'Auditorio' },
      { nombre: 'Laboratorio Anatomía FM', capacidad: 30, tipo: 'Laboratorio' },
      { nombre: 'Aula A FM', capacidad: 100, tipo: 'Aula' },
    ],
  },
];

// Docentes reales (formato: inicial.apellido@umss.edu.bo)
const DOCENTES_DATA = [
  // FCyT
  {
    nombre: 'Vladimir',
    apellido: 'Costas Cuba',
    correo: 'vl.costas@umss.edu.bo',
    facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: ['Ingeniería de Sistemas', 'Ingeniería Informática'],
    materias: ['ALG', 'BD1', 'BD2'],
  },
  {
    nombre: 'Miriam',
    apellido: 'Morales Serrudo',
    correo: 'mi.morales@umss.edu.bo',
    facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: ['Ingeniería de Sistemas'],
    materias: ['ISW1', 'ISW2'],
  },
  {
    nombre: 'Edgar',
    apellido: 'Flores Tola',
    correo: 'ed.flores@umss.edu.bo',
    facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: ['Ingeniería de Sistemas', 'Ingeniería Informática'],
    materias: ['REDES', 'SO'],
  },
  {
    nombre: 'Rosario',
    apellido: 'Arteaga Uzquiano',
    correo: 'ro.arteaga@umss.edu.bo',
    facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: ['Ingeniería de Sistemas'],
    materias: ['CALCI', 'CALCII', 'ALG-LIN'],
  },
  {
    nombre: 'Carlos',
    apellido: 'Peñaranda Flores',
    correo: 'ca.penaranda@umss.edu.bo',
    facultad: 'Facultad de Ciencias y Tecnología (FCyT)',
    carreras: ['Ingeniería Informática'],
    materias: ['IA2', 'CD', 'ML'],
  },
  // FCE
  {
    nombre: 'Patricia',
    apellido: 'Burgoa Tarifa',
    correo: 'pa.burgoa@umss.edu.bo',
    facultad: 'Facultad de Ciencias Económicas (FCE)',
    carreras: ['Administración de Empresas'],
    materias: ['ADM1', 'ADM2', 'MKTG'],
  },
  {
    nombre: 'Marco',
    apellido: 'Quiroga Villanueva',
    correo: 'ma.quiroga@umss.edu.bo',
    facultad: 'Facultad de Ciencias Económicas (FCE)',
    carreras: ['Contaduría Pública', 'Economía'],
    materias: ['CONT1', 'CONT2', 'AUD'],
  },
  // FHCE
  {
    nombre: 'Ana',
    apellido: 'Sejas Mendivil',
    correo: 'an.sejas@umss.edu.bo',
    facultad: 'Facultad de Humanidades y Ciencias de la Educación (FHCE)',
    carreras: ['Psicología'],
    materias: ['PSI-GEN', 'PSI-CLIN', 'EVAL-PSI'],
  },
  // FCJP
  {
    nombre: 'Ramiro',
    apellido: 'Zapata Arce',
    correo: 'ra.zapata@umss.edu.bo',
    facultad: 'Facultad de Ciencias Jurídicas y Políticas (FCJP)',
    carreras: ['Derecho'],
    materias: ['DER-CIV', 'DER-PEN', 'PROCE'],
  },
];

// Estudiantes reales con formato CIS UMSS (cod_sis de 9 dígitos)
const ESTUDIANTES_DATA = [
  // Sistemas
  {
    cod_sis: '201901234',
    nombre: 'Alejandro',
    apellido: 'Mamani Quispe',
    ci: '8765432',
  },
  {
    cod_sis: '201901235',
    nombre: 'Gabriela',
    apellido: 'Torrez Balderrama',
    ci: '7654321',
  },
  {
    cod_sis: '201901236',
    nombre: 'Diego',
    apellido: 'Camacho Vargas',
    ci: '6543210',
  },
  {
    cod_sis: '201901237',
    nombre: 'Valeria',
    apellido: 'Rojas Quiroga',
    ci: '5432109',
  },
  {
    cod_sis: '201901238',
    nombre: 'Rodrigo',
    apellido: 'Soto Villarroel',
    ci: '4321098',
  },
  {
    cod_sis: '202001001',
    nombre: 'Luciana',
    apellido: 'Pedraza Montaño',
    ci: '9876543',
  },
  {
    cod_sis: '202001002',
    nombre: 'Fernando',
    apellido: 'Aguilar Rivas',
    ci: '8765430',
  },
  {
    cod_sis: '202001003',
    nombre: 'Daniela',
    apellido: 'Cruz Herrera',
    ci: '7654328',
  },
  {
    cod_sis: '202001004',
    nombre: 'Andrés',
    apellido: 'Lima Bernal',
    ci: '6543217',
  },
  {
    cod_sis: '202001005',
    nombre: 'Camila',
    apellido: 'Flores Gutiérrez',
    ci: '5432106',
  },
  {
    cod_sis: '202101010',
    nombre: 'Sebastián',
    apellido: 'Vargas Orellana',
    ci: '4321095',
  },
  {
    cod_sis: '202101011',
    nombre: 'Natalia',
    apellido: 'Quispe Calle',
    ci: '3210984',
  },
  {
    cod_sis: '202101012',
    nombre: 'Josué',
    apellido: 'Medina Salinas',
    ci: '2109873',
  },
  {
    cod_sis: '202101013',
    nombre: 'Andrea',
    apellido: 'Heredia Ponce',
    ci: '1098762',
  },
  {
    cod_sis: '202101014',
    nombre: 'Pablo',
    apellido: 'Gutiérrez Chávez',
    ci: '9988776',
  },
  // Informática
  {
    cod_sis: '202001050',
    nombre: 'Javier',
    apellido: 'Mendoza Terán',
    ci: '8877665',
  },
  {
    cod_sis: '202001051',
    nombre: 'Sofía',
    apellido: 'Alvarado Coca',
    ci: '7766554',
  },
  {
    cod_sis: '202001052',
    nombre: 'Miguel',
    apellido: 'Vásquez Fuentes',
    ci: '6655443',
  },
  {
    cod_sis: '202001053',
    nombre: 'Isabella',
    apellido: 'Pardo Daza',
    ci: '5544332',
  },
  {
    cod_sis: '202001054',
    nombre: 'Emilio',
    apellido: 'Romero Bejarano',
    ci: '4433221',
  },
  // FCE
  {
    cod_sis: '202000100',
    nombre: 'Valentina',
    apellido: 'Sandoval Rada',
    ci: '3322110',
  },
  {
    cod_sis: '202000101',
    nombre: 'Nicolás',
    apellido: 'Vega Mostacedo',
    ci: '2211009',
  },
  {
    cod_sis: '202000102',
    nombre: 'Mariana',
    apellido: 'Ibáñez Cortez',
    ci: '1100998',
  },
  {
    cod_sis: '202000103',
    nombre: 'Claudio',
    apellido: 'Ramos Antelo',
    ci: '9900887',
  },
  {
    cod_sis: '202000104',
    nombre: 'Paulina',
    apellido: 'Céspedes Arana',
    ci: '8800776',
  },
  // FHCE / Psicología
  {
    cod_sis: '202100200',
    nombre: 'Elena',
    apellido: 'Morales Vargas',
    ci: '7700665',
  },
  {
    cod_sis: '202100201',
    nombre: 'Marcos',
    apellido: 'Ortiz Villalobos',
    ci: '6600554',
  },
  {
    cod_sis: '202100202',
    nombre: 'Cindy',
    apellido: 'Cabrera Soliz',
    ci: '5500443',
  },
];

// ============================================================
// 2. FUNCIÓN PRINCIPAL
// ============================================================

async function main() {
  console.log('\n🌱 Iniciando seed UMSS...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── 2.1 Limpiar datos previos (orden seguro por FK) ──────
  console.log('🧹 Limpiando datos previos...');
  await prisma.ingreso.deleteMany();
  await prisma.codigoQr.deleteMany();
  await prisma.examen_Estudiante.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.cargaEstudiantes.deleteMany();
  await prisma.examen_Carrera_Materia.deleteMany();
  await prisma.examen.deleteMany();
  await prisma.reservaAmbiente.deleteMany();
  await prisma.usuario_Alcance.deleteMany();
  await prisma.usuario_Rol.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.rol_Permiso.deleteMany();
  await prisma.rol_Modulo.deleteMany();
  await prisma.rol.deleteMany();
  await prisma.ambiente.deleteMany();
  await prisma.tipoAula.deleteMany();
  await prisma.carrera_Materia.deleteMany();
  await prisma.materia.deleteMany();
  await prisma.carrera.deleteMany();
  await prisma.facultad.deleteMany();
  await prisma.permiso.deleteMany();
  await prisma.modulo.deleteMany();
  await prisma.bitacora_Auditoria.deleteMany();
  console.log('✅ Limpieza completa.\n');

  // ── 2.2 Módulos del sistema ───────────────────────────────
  console.log('📦 Creando módulos...');
  const modulosNombres = [
    'Usuarios',
    'Roles',
    'Exámenes',
    'Estudiantes',
    'Ambientes',
    'Auditoría',
  ];
  const moduloMap: Record<string, number> = {};
  for (const nombre of modulosNombres) {
    const m = await prisma.modulo.create({ data: { nombre, activo: true } });
    moduloMap[nombre] = m.id;
  }

  // ── 2.3 Permisos por módulo ───────────────────────────────
  const permisosData = [
    // Usuarios
    {
      modulo: 'Usuarios',
      clave: 'usuarios.ver',
      descripcion: 'Ver listado de usuarios',
    },
    {
      modulo: 'Usuarios',
      clave: 'usuarios.crear',
      descripcion: 'Crear nuevos usuarios',
    },
    {
      modulo: 'Usuarios',
      clave: 'usuarios.editar',
      descripcion: 'Editar usuarios existentes',
    },
    {
      modulo: 'Usuarios',
      clave: 'usuarios.desactivar',
      descripcion: 'Desactivar usuarios',
    },
    // Roles
    {
      modulo: 'Roles',
      clave: 'roles.ver',
      descripcion: 'Ver listado de roles',
    },
    {
      modulo: 'Roles',
      clave: 'roles.crear',
      descripcion: 'Crear nuevos roles',
    },
    {
      modulo: 'Roles',
      clave: 'roles.editar',
      descripcion: 'Editar roles existentes',
    },
    { modulo: 'Roles', clave: 'roles.eliminar', descripcion: 'Eliminar roles' },
    // Exámenes
    {
      modulo: 'Exámenes',
      clave: 'examenes.ver',
      descripcion: 'Ver listado de exámenes',
    },
    {
      modulo: 'Exámenes',
      clave: 'examenes.crear',
      descripcion: 'Crear nuevos exámenes',
    },
    {
      modulo: 'Exámenes',
      clave: 'examenes.editar',
      descripcion: 'Editar exámenes',
    },
    {
      modulo: 'Exámenes',
      clave: 'examenes.eliminar',
      descripcion: 'Cancelar/eliminar exámenes',
    },
    // Estudiantes
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.ver',
      descripcion: 'Ver listado de estudiantes',
    },
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.registrar',
      descripcion: 'Registrar ingreso de estudiantes',
    },
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.habilitar',
      descripcion: 'Habilitar/inhabilitar estudiantes',
    },
    // Ambientes
    {
      modulo: 'Ambientes',
      clave: 'ambientes.ver',
      descripcion: 'Ver ambientes disponibles',
    },
    {
      modulo: 'Ambientes',
      clave: 'ambientes.gestionar',
      descripcion: 'Gestionar reservas de ambientes',
    },
    // Auditoría
    {
      modulo: 'Auditoría',
      clave: 'auditoria.ver',
      descripcion: 'Ver bitácora de auditoría',
    },
  ];

  const permisoMap: Record<string, number> = {};
  for (const p of permisosData) {
    const perm = await prisma.permiso.create({
      data: {
        clave: p.clave,
        descripcion: p.descripcion,
        moduloId: moduloMap[p.modulo],
      },
    });
    permisoMap[p.clave] = perm.id;
  }
  console.log(`✅ ${permisosData.length} permisos creados.`);

  // ── 2.4 Roles ─────────────────────────────────────────────
  console.log('🎭 Creando roles...');

  const todosLosPermisos = Object.values(permisoMap);

  const rolAdmin = await prisma.rol.create({
    data: {
      nombre: 'Administrador',
      descripcion: 'Control total del sistema ExaControl UMSS',
      permisos: { create: todosLosPermisos.map((id) => ({ permisoId: id })) },
      modulos: {
        create: Object.values(moduloMap).map((id) => ({ moduloId: id })),
      },
    },
  });

  const permisosDocente = [
    'examenes.ver',
    'examenes.crear',
    'examenes.editar',
    'examenes.eliminar',
    'estudiantes.ver',
    'estudiantes.habilitar',
    'ambientes.ver',
  ];
  const rolDocente = await prisma.rol.create({
    data: {
      nombre: 'Docente',
      descripcion: 'Docente universitario con acceso a sus propios exámenes',
      permisos: {
        create: permisosDocente.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: ['Exámenes', 'Estudiantes', 'Ambientes'].map((m) => ({
          moduloId: moduloMap[m],
        })),
      },
    },
  });

  const permisosControlAcceso = [
    'examenes.ver',
    'estudiantes.ver',
    'estudiantes.registrar',
  ];
  const rolControlAcceso = await prisma.rol.create({
    data: {
      nombre: 'Control de Acceso',
      descripcion: 'Personal de control de ingreso en exámenes',
      permisos: {
        create: permisosControlAcceso.map((c) => ({
          permisoId: permisoMap[c],
        })),
      },
      modulos: {
        create: ['Exámenes', 'Estudiantes'].map((m) => ({
          moduloId: moduloMap[m],
        })),
      },
    },
  });

  const permisosVisor = ['examenes.ver', 'estudiantes.ver', 'ambientes.ver'];
  await prisma.rol.create({
    data: {
      nombre: 'Visor',
      descripcion: 'Solo puede visualizar información del sistema',
      permisos: {
        create: permisosVisor.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: ['Exámenes', 'Estudiantes', 'Ambientes'].map((m) => ({
          moduloId: moduloMap[m],
        })),
      },
    },
  });

  console.log('✅ Roles creados.');

  // ── 2.5 Usuarios Base ─────────────────────────────
  console.log('👤 Creando usuario administrador y control...');
  const adminUser = await prisma.usuario.create({
    data: {
      nombre: 'Admin',
      apellido: 'UMSS ExaControl',
      correo: 'admin@exacontrol.com',
      password: passwordHash,
      roles: { create: [{ rolId: rolAdmin.id }] },
    },
  });

  // Usuario de Control de Acceso (no docente)
  const controlUser = await prisma.usuario.create({
    data: {
      nombre: 'Control',
      apellido: 'Acceso General',
      correo: 'control@exacontrol.com',
      password: passwordHash,
      roles: { create: [{ rolId: rolControlAcceso.id }] },
    },
  });

  // Usuario de Control de Acceso Específico (2 materias)
  const control2User = await prisma.usuario.create({
    data: {
      nombre: 'Control',
      apellido: 'Acceso Específico',
      correo: 'control2@exacontrol.com',
      password: passwordHash,
      roles: { create: [{ rolId: rolControlAcceso.id }] },
    },
  });
  console.log('✅ Administrador y usuarios de control creados.');

  // ── 2.6 Facultades, Carreras, Materias y Ambientes ────────
  console.log('\n🏫 Creando estructura académica UMSS...');
  const facultadMap: Record<string, number> = {};
  const carreraMap: Record<string, number> = {};
  const materiaMap: Record<string, number> = {};
  const ambientesPorFacultad: Record<string, number[]> = {};
  const tipoAulaMap: Record<string, number> = {};

  // Tipos de aula
  for (const tipo of ['Aula', 'Laboratorio', 'Auditorio', 'Sala de Lectura']) {
    const ta = await prisma.tipoAula.create({ data: { nombre: tipo } });
    tipoAulaMap[tipo] = ta.id;
  }

  for (const fac of FACULTADES_DATA) {
    const facultad = await prisma.facultad.create({
      data: { nombre: fac.nombre },
    });
    facultadMap[fac.nombre] = facultad.id;
    ambientesPorFacultad[fac.nombre] = [];

    // Ambientes de la facultad
    for (const amb of fac.ambientes) {
      const ambiente = await prisma.ambiente.create({
        data: {
          nombre: amb.nombre,
          capacidad: amb.capacidad,
          facultadId: facultad.id,
          tipoAulaId: tipoAulaMap[amb.tipo] ?? null,
          estadoAula: EstadoAula.DISPONIBLE,
        },
      });
      ambientesPorFacultad[fac.nombre].push(ambiente.id);
    }

    // Carreras y materias
    for (const car of fac.carreras) {
      const carrera = await prisma.carrera.create({
        data: { nombre: car.nombre, facultadId: facultad.id },
      });
      carreraMap[car.nombre] = carrera.id;

      for (const mat of car.materias) {
        // Reusar materia si ya existe (misma sigla/nombre compartida entre carreras)
        let materia = await prisma.materia.findFirst({
          where: { sigla: mat.sigla },
        });
        if (!materia) {
          materia = await prisma.materia.create({
            data: { sigla: mat.sigla, nombre: mat.nombre },
          });
          materiaMap[mat.sigla] = materia.id;
        } else {
          materiaMap[mat.sigla] = materia.id;
        }

        // Relación carrera-materia (upsert para evitar duplicados)
        await prisma.carrera_Materia.upsert({
          where: {
            carreraId_materiaId: {
              carreraId: carrera.id,
              materiaId: materia.id,
            },
          },
          update: {},
          create: { carreraId: carrera.id, materiaId: materia.id },
        });
      }
    }
    console.log(`  ✓ ${fac.nombre}`);
  }
  console.log('✅ Estructura académica creada.\n');

  // ── 2.6.5 Alcances para Control ─────────────────────────────
  console.log('🛡️ Asignando alcances a usuarios de Control...');
  const todasRelaciones = await prisma.carrera_Materia.findMany({
    include: { carrera: true },
  });

  // Control General: Todas las materias de todas las facultades y carreras
  await prisma.usuario_Alcance.createMany({
    data: todasRelaciones.map((rel) => ({
      usuarioId: controlUser.id,
      facultadId: rel.carrera.facultadId,
      carreraId: rel.carreraId,
      materiaId: rel.materiaId,
    })),
  });

  // Control Específico: Solo 2 materias (ej: BD1 y ALG de Sistemas)
  const relBD1 = todasRelaciones.find(
    (r) =>
      r.carreraId === carreraMap['Ingeniería de Sistemas'] &&
      r.materiaId === materiaMap['BD1'],
  );
  const relALG = todasRelaciones.find(
    (r) =>
      r.carreraId === carreraMap['Ingeniería de Sistemas'] &&
      r.materiaId === materiaMap['ALG'],
  );
  if (relBD1 && relALG) {
    await prisma.usuario_Alcance.createMany({
      data: [
        {
          usuarioId: control2User.id,
          facultadId: relBD1.carrera.facultadId,
          carreraId: relBD1.carreraId,
          materiaId: relBD1.materiaId,
        },
        {
          usuarioId: control2User.id,
          facultadId: relALG.carrera.facultadId,
          carreraId: relALG.carreraId,
          materiaId: relALG.materiaId,
        },
      ],
    });
  }
  console.log('✅ Alcances asignados a Control.\n');

  // ── 2.7 Docentes con alcances ─────────────────────────────
  console.log('👨‍🏫 Creando docentes...');
  const docenteUsuarios: Record<string, number> = {};

  for (const doc of DOCENTES_DATA) {
    const facId = facultadMap[doc.facultad];
    const docente = await prisma.usuario.create({
      data: {
        nombre: doc.nombre,
        apellido: doc.apellido,
        correo: doc.correo,
        password: passwordHash,
        roles: { create: [{ rolId: rolDocente.id }] },
      },
    });
    docenteUsuarios[doc.correo] = docente.id;

    // Un alcance específico por cada materia, incluyendo la carrera que la contiene.
    // Así cada docente solo tiene acceso a SUS materias, no a todas las de la facultad.
    for (const sigla of doc.materias) {
      const matId = materiaMap[sigla];
      if (!matId) continue;

      // Buscar en qué carrera(s) del docente existe esta materia
      for (const carNombre of doc.carreras) {
        const carId = carreraMap[carNombre];
        if (!carId) continue;

        // Solo crear el alcance si esa carrera efectivamente tiene esa materia
        const rel = await prisma.carrera_Materia.findUnique({
          where: {
            carreraId_materiaId: { carreraId: carId, materiaId: matId },
          },
        });
        if (rel) {
          await prisma.usuario_Alcance.create({
            data: {
              usuarioId: docente.id,
              facultadId: facId,
              carreraId: carId,
              materiaId: matId,
            },
          });
        }
      }
    }

    console.log(`  ✓ ${doc.nombre} ${doc.apellido} (${doc.correo})`);
  }
  console.log('✅ Docentes creados.\n');

  // ── 2.8 Carga de estudiantes ──────────────────────────────
  console.log('🎓 Creando estudiantes...');
  const carga = await prisma.cargaEstudiantes.create({
    data: {
      archivoNombre: 'padron_umss_2024_i.csv',
      fechaCarga: new Date(),
      cargadoPor: adminUser.id,
      cantidadRegistros: ESTUDIANTES_DATA.length,
    },
  });

  const estudianteMap: Record<string, number> = {};
  for (const est of ESTUDIANTES_DATA) {
    const estudiante = await prisma.estudiante.create({
      data: {
        cod_sis: est.cod_sis,
        nombre: est.nombre,
        apellido: est.apellido,
        ci: est.ci,
        cargaId: carga.id,
      },
    });
    estudianteMap[est.cod_sis] = estudiante.id;
  }
  console.log(`✅ ${ESTUDIANTES_DATA.length} estudiantes creados.\n`);

  // ── 2.9 Exámenes y reservas ───────────────────────────────
  console.log('📋 Creando exámenes con reservas...');

  const ahora = new Date();
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  const manana = new Date(ahora);
  manana.setDate(ahora.getDate() + 1);
  const pasado = new Date(ahora);
  pasado.setDate(ahora.getDate() + 2);
  const hace3Dias = new Date(ahora);
  hace3Dias.setDate(ahora.getDate() - 3);

  const horaIni08 = new Date('1970-01-01T08:00:00Z');
  const horaFin10 = new Date('1970-01-01T10:00:00Z');
  const horaIni10 = new Date('1970-01-01T10:00:00Z');
  const horaFin12 = new Date('1970-01-01T12:00:00Z');
  const horaIni14 = new Date('1970-01-01T14:00:00Z');
  const horaFin16 = new Date('1970-01-01T16:00:00Z');

  // Docente Vladimir Costas — Examen EN_CURSO (hoy)
  const docVlad = docenteUsuarios['vl.costas@umss.edu.bo'];
  const ambFCyT =
    ambientesPorFacultad['Facultad de Ciencias y Tecnología (FCyT)'];
  const reserva1 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[0],
      usuarioId: docVlad,
      fecha: ahora,
      horaIni: horaIni08,
      horaFin: horaFin10,
      motivo: 'Examen Primer Parcial - Bases de Datos I',
      estadoAula: EstadoAula.RESERVADO,
    },
  });
  const examen1 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva1.id,
      usuarioId: docVlad,
      tipoExamen: 'Primer parcial',
      normasEx:
        'Prohibido el uso de calculadoras. Material cerrado. Presentar carnet universitario.',
      estadoExamId: 1,
      estado: EstadoExamen.EN_CURSO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen1.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['BD1'],
    },
  });
  // Habilitar estudiantes de Sistemas en este examen
  const sistStudents = [
    '201901234',
    '201901235',
    '201901236',
    '201901237',
    '201901238',
    '202001001',
    '202001002',
    '202001003',
    '202001004',
    '202001005',
  ];
  for (const cod of sistStudents) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen1.id,
        estado_habilitado: true,
      },
    });
  }
  // Registrar ingresos de algunos estudiantes
  for (const cod of sistStudents.slice(0, 6)) {
    await prisma.ingreso.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen1.id,
        fechaHora: ahora,
        metodo: 'QR',
        registradoPor: controlUser.id,
      },
    });
  }

  // Docente Miriam Morales — Examen PROGRAMADO (mañana)
  const docMiriam = docenteUsuarios['mi.morales@umss.edu.bo'];
  const reserva2 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[2],
      usuarioId: docMiriam,
      fecha: manana,
      horaIni: horaIni10,
      horaFin: horaFin12,
      motivo: 'Examen Segundo Parcial - Ingeniería de Software I',
      estadoAula: EstadoAula.RESERVADO,
    },
  });
  const examen2 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva2.id,
      usuarioId: docMiriam,
      tipoExamen: 'Segundo parcial',
      normasEx:
        'Se permite una hoja de apuntes A4 por ambos lados. Presentar carnet universitario.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen2.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['ISW1'],
    },
  });
  const sistStudents2 = [
    '202001001',
    '202001002',
    '202001003',
    '202101010',
    '202101011',
    '202101012',
  ];
  for (const cod of sistStudents2) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen2.id,
        estado_habilitado: true,
      },
    });
  }
  // Uno inhabilitado (aplazo el parcial anterior)
  await prisma.examen_Estudiante.update({
    where: {
      estudianteId_examenId: {
        estudianteId: estudianteMap['202001003'],
        examenId: examen2.id,
      },
    },
    data: {
      estado_habilitado: false,
      motivo_inhabilitacion: 'No aprobó el primer parcial (nota: 28)',
    },
  });

  // Docente Edgar Flores — Examen PROGRAMADO pasado mañana (editado)
  const docEdgar = docenteUsuarios['ed.flores@umss.edu.bo'];
  const reserva3 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[1],
      usuarioId: docEdgar,
      fecha: pasado,
      horaIni: horaIni08,
      horaFin: horaFin10,
      motivo: 'Examen Final - Redes de Computadoras',
      estadoAula: EstadoAula.RESERVADO,
    },
  });
  const examen3 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva3.id,
      usuarioId: docEdgar,
      tipoExamen: 'Examen final',
      normasEx:
        'Material abierto. Calculadora permitida. Traer carnet y libreta universitaria.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
      fueEditado: true,
    },
  });
  await prisma.examen_Carrera_Materia.createMany({
    data: [
      {
        examenId: examen3.id,
        carreraId: carreraMap['Ingeniería de Sistemas'],
        materiaId: materiaMap['REDES'],
      },
    ],
  });
  const estudiantesRedes = [
    '202001001',
    '202001002',
    '202001004',
    '202001005',
    '202001050',
    '202001051',
    '202001052',
    '202001053',
    '202001054',
  ];
  for (const cod of estudiantesRedes) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen3.id,
        estado_habilitado: true,
      },
    });
  }

  // Docente Vladimir — Examen FINALIZADO (hace 3 días)
  const reserva4 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[3],
      usuarioId: docVlad,
      fecha: hace3Dias,
      horaIni: horaIni14,
      horaFin: horaFin16,
      motivo: 'Examen Recuperatorio - Algoritmos',
      estadoAula: EstadoAula.DISPONIBLE,
    },
  });
  const examen4 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva4.id,
      usuarioId: docVlad,
      tipoExamen: 'Examen de recuperatorio',
      normasEx: 'Sin material de apoyo. Presentar carnet universitario.',
      estadoExamId: 1,
      estado: EstadoExamen.FINALIZADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen4.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['ALG'],
    },
  });
  const estudiantesRecup = ['201901234', '201901235', '201901236', '201901237'];
  for (const cod of estudiantesRecup) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen4.id,
        estado_habilitado: true,
      },
    });
  }
  for (const cod of estudiantesRecup) {
    await prisma.ingreso.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen4.id,
        fechaHora: hace3Dias,
        metodo: 'Manual',
        registradoPor: controlUser.id,
      },
    });
  }

  // Docente Patricia Burgoa — FCE — PROGRAMADO mañana
  const docPatricia = docenteUsuarios['pa.burgoa@umss.edu.bo'];
  const ambFCE = ambientesPorFacultad['Facultad de Ciencias Económicas (FCE)'];
  const reserva5 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCE[0],
      usuarioId: docPatricia,
      fecha: manana,
      horaIni: horaIni14,
      horaFin: horaFin16,
      motivo: 'Examen Final - Administración II',
      estadoAula: EstadoAula.RESERVADO,
    },
  });
  const examen5 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva5.id,
      usuarioId: docPatricia,
      tipoExamen: 'Examen final',
      normasEx: 'Examen escrito. Prohibido uso de dispositivos electrónicos.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen5.id,
      carreraId: carreraMap['Administración de Empresas'],
      materiaId: materiaMap['ADM2'],
    },
  });
  const estudiantesAdm = [
    '202000100',
    '202000101',
    '202000102',
    '202000103',
    '202000104',
  ];
  for (const cod of estudiantesAdm) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen5.id,
        estado_habilitado: true,
      },
    });
  }

  // Examen CANCELADO (Derecho)
  const docRamiro = docenteUsuarios['ra.zapata@umss.edu.bo'];
  const ambFCJP =
    ambientesPorFacultad['Facultad de Ciencias Jurídicas y Políticas (FCJP)'];
  const reserva6 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCJP[0],
      usuarioId: docRamiro,
      fecha: ayer,
      horaIni: horaIni08,
      horaFin: horaFin10,
      motivo: 'Examen Primer Parcial - Derecho Civil (cancelado)',
      estadoAula: EstadoAula.DISPONIBLE,
    },
  });
  await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva6.id,
      usuarioId: docRamiro,
      tipoExamen: 'Primer parcial',
      normasEx: 'Código Civil permitido. Sin anotaciones en el código.',
      estadoExamId: 1,
      estado: EstadoExamen.CANCELADO,
    },
  });

  // ── 2.10 Reservas libres (sin examen) — para que cada docente pueda crear exámenes ──
  console.log('🗓️  Creando reservas libres por docente...');

  const d3 = new Date(ahora);
  d3.setDate(ahora.getDate() + 3);
  const d4 = new Date(ahora);
  d4.setDate(ahora.getDate() + 4);
  const d5 = new Date(ahora);
  d5.setDate(ahora.getDate() + 5);
  const d7 = new Date(ahora);
  d7.setDate(ahora.getDate() + 7);
  const d10 = new Date(ahora);
  d10.setDate(ahora.getDate() + 10);
  const d14 = new Date(ahora);
  d14.setDate(ahora.getDate() + 14);

  const horaIni07 = new Date('1970-01-01T07:00:00Z');
  const horaFin09 = new Date('1970-01-01T09:00:00Z');
  const horaIni16 = new Date('1970-01-01T16:00:00Z');
  const horaFin18 = new Date('1970-01-01T18:00:00Z');

  // Vladimir Costas (FCyT) — 3 reservas libres en Lab y Aulas
  const docVlad2 = docenteUsuarios['vl.costas@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCyT[0],
        usuarioId: docVlad2,
        fecha: d3,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — BD2',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[2],
        usuarioId: docVlad2,
        fecha: d5,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Algoritmos',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[4],
        usuarioId: docVlad2,
        fecha: d10,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — BD1 Recuperatorio',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Miriam Morales (FCyT) — 2 reservas libres
  const docMiriam2 = docenteUsuarios['mi.morales@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCyT[3],
        usuarioId: docMiriam2,
        fecha: d4,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — ISW2',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[5],
        usuarioId: docMiriam2,
        fecha: d7,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — ISW1 Final',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Edgar Flores (FCyT) — 2 reservas libres
  const docEdgar2 = docenteUsuarios['ed.flores@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCyT[1],
        usuarioId: docEdgar2,
        fecha: d5,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Sistemas Operativos',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[4],
        usuarioId: docEdgar2,
        fecha: d14,
        horaIni: horaIni07,
        horaFin: horaFin09,
        motivo: 'Disponible — Redes Recuperatorio',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Rosario Arteaga (FCyT) — 3 reservas libres
  const docRosario = docenteUsuarios['ro.arteaga@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCyT[2],
        usuarioId: docRosario,
        fecha: d3,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — Cálculo I Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[3],
        usuarioId: docRosario,
        fecha: d7,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — Cálculo II Final',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[5],
        usuarioId: docRosario,
        fecha: d10,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Álgebra Lineal',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Carlos Peñaranda (FCyT) — 2 reservas libres
  const docCarlos = docenteUsuarios['ca.penaranda@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCyT[0],
        usuarioId: docCarlos,
        fecha: d4,
        horaIni: horaIni16,
        horaFin: horaFin18,
        motivo: 'Disponible — IA II Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCyT[6],
        usuarioId: docCarlos,
        fecha: d14,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — Machine Learning Final',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Patricia Burgoa (FCE) — 2 reservas libres
  const docPatricia2 = docenteUsuarios['pa.burgoa@umss.edu.bo'];
  const ambFCE2 = ambientesPorFacultad['Facultad de Ciencias Económicas (FCE)'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCE2[1],
        usuarioId: docPatricia2,
        fecha: d3,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — ADM1 Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCE2[0],
        usuarioId: docPatricia2,
        fecha: d7,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Marketing Recuperatorio',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Marco Quiroga (FCE) — 3 reservas libres
  const docMarco = docenteUsuarios['ma.quiroga@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCE2[0],
        usuarioId: docMarco,
        fecha: d4,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — Contabilidad Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCE2[1],
        usuarioId: docMarco,
        fecha: d5,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — Auditoría Final',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCE2[2],
        usuarioId: docMarco,
        fecha: d10,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Costos Recuperatorio',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Ana Sejas (FHCE) — 2 reservas libres
  const docAna = docenteUsuarios['an.sejas@umss.edu.bo'];
  const ambFHCE =
    ambientesPorFacultad[
      'Facultad de Humanidades y Ciencias de la Educación (FHCE)'
    ];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFHCE[0],
        usuarioId: docAna,
        fecha: d5,
        horaIni: horaIni08,
        horaFin: horaFin10,
        motivo: 'Disponible — Psicología General Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFHCE[2],
        usuarioId: docAna,
        fecha: d14,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — Evaluación Psicológica Final',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  // Ramiro Zapata (FCJP) — 2 reservas libres
  const docRamiro2 = docenteUsuarios['ra.zapata@umss.edu.bo'];
  await prisma.reservaAmbiente.createMany({
    data: [
      {
        ambienteId: ambFCJP[1],
        usuarioId: docRamiro2,
        fecha: d4,
        horaIni: horaIni10,
        horaFin: horaFin12,
        motivo: 'Disponible — Derecho Penal Parcial',
        estadoAula: EstadoAula.RESERVADO,
      },
      {
        ambienteId: ambFCJP[0],
        usuarioId: docRamiro2,
        fecha: d10,
        horaIni: horaIni14,
        horaFin: horaFin16,
        motivo: 'Disponible — Derecho Civil Final',
        estadoAula: EstadoAula.RESERVADO,
      },
    ],
  });

  console.log('✅ Reservas libres creadas.\n');
  console.log('✅ Exámenes y reservas creados.\n');

  // ── 2.10 Resumen final ────────────────────────────────────
  console.log('='.repeat(55));
  console.log('🎉 SEED UMSS COMPLETADO');
  console.log('='.repeat(55));
  console.log(`\n🔐 Contraseña de TODOS los usuarios: ${PASSWORD}`);
  console.log('\n👤 Usuarios del sistema:');
  console.log('  Admin:   admin@exacontrol.com       (Administrador)');
  console.log('  Control: control@exacontrol.com     (Control de Acceso)');
  console.log('\n👨‍🏫 Docentes:');
  for (const d of DOCENTES_DATA) {
    console.log(`  ${d.correo.padEnd(35)} ${d.nombre} ${d.apellido}`);
  }
  console.log(`\n📊 Resumen:`);
  console.log(`  Facultades : ${FACULTADES_DATA.length}`);
  const totalCarreras = FACULTADES_DATA.reduce(
    (s, f) => s + f.carreras.length,
    0,
  );
  const totalAmbientes = FACULTADES_DATA.reduce(
    (s, f) => s + f.ambientes.length,
    0,
  );
  console.log(`  Carreras   : ${totalCarreras}`);
  console.log(`  Ambientes  : ${totalAmbientes}`);
  console.log(`  Docentes   : ${DOCENTES_DATA.length}`);
  console.log(`  Estudiantes: ${ESTUDIANTES_DATA.length}`);
  console.log(
    `  Exámenes   : 6 (1 EN CURSO, 2 PROGRAMADOS, 1 PROGRAMADO-EDITADO, 1 FINALIZADO, 1 CANCELADO)`,
  );
  console.log('='.repeat(55));
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
