/* eslint-disable */

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

// EstadoReserva y EstadoSolicitud como string literals (hasta prisma generate)
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

// Estudiantes de prueba (cod_sis 9 digitos UMSS)
// Login DEV/testing: {cod_sis}@est.umss.edu.bo + CI
// Login PROD: cod_sis + CI (endpoint dedicado Sprint 2 backend)
const ESTUDIANTES_DATA = [
  // FCyT Sistemas / Informatica
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
    apellido: 'Pedraza Montano',
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
    nombre: 'Andres',
    apellido: 'Lima Bernal',
    ci: '6543217',
  },
  {
    cod_sis: '202001005',
    nombre: 'Camila',
    apellido: 'Flores Gutierrez',
    ci: '5432106',
  },
  {
    cod_sis: '202101010',
    nombre: 'Sebastian',
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
    nombre: 'Josue',
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
    apellido: 'Gutierrez Chavez',
    ci: '9988776',
  },
  {
    cod_sis: '202001050',
    nombre: 'Javier',
    apellido: 'Mendoza Teran',
    ci: '8877665',
  },
  {
    cod_sis: '202001051',
    nombre: 'Sofia',
    apellido: 'Alvarado Coca',
    ci: '7766554',
  },
  {
    cod_sis: '202001052',
    nombre: 'Miguel',
    apellido: 'Vasquez Fuentes',
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
    nombre: 'Nicolas',
    apellido: 'Vega Mostacedo',
    ci: '2211009',
  },
  {
    cod_sis: '202000102',
    nombre: 'Mariana',
    apellido: 'Ibanez Cortez',
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
    apellido: 'Cespedes Arana',
    ci: '8800776',
  },
  // FHCE
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
async function main() {
  console.log('\n Iniciando seed UMSS (Sprint 2)...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 2.1 Limpiar datos previos (orden seguro por FK)
  console.log('Limpiando datos previos...');
  await prisma.incidenciaIngreso.deleteMany();
  await prisma.examenControlador.deleteMany();
  await prisma.docenteColaborador.deleteMany();
  await prisma.ingreso.deleteMany();
  await prisma.codigoQr.deleteMany();
  await prisma.examen_Estudiante.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.cargaEstudiantes.deleteMany();
  await prisma.examen_Carrera_Materia.deleteMany();
  await prisma.examen.deleteMany();
  await prisma.reservaAmbiente.deleteMany();
  await prisma.horarioFijo.deleteMany();
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
  await prisma.tokenRecuperacion.deleteMany();
  console.log('OK: Limpieza completa.\n');

  // 2.2 Modulos
  console.log('Creando modulos...');
  const modulosData: Array<{ nombre: string; activo: boolean }> = [
    { nombre: 'Usuarios', activo: true },
    { nombre: 'Roles', activo: true },
    { nombre: 'Examenes', activo: true },
    { nombre: 'Estudiantes', activo: true },
    { nombre: 'Auditoria', activo: true },
    { nombre: 'Ambientes', activo: true },
    { nombre: 'Portal Estudiante', activo: true },
    { nombre: 'Control de ingreso', activo: true },
    { nombre: 'Registro de ingresos', activo: true },
    { nombre: 'Incidencias', activo: true },
    { nombre: 'Colaboradores', activo: true },
  ];
  const moduloMap: Record<string, number> = {};
  for (const m of modulosData) {
    const mod = await prisma.modulo.create({ data: m });
    moduloMap[m.nombre] = mod.id;
  }
  console.log(`OK: ${modulosData.length} modulos creados.`);

  // 2.3 Permisos
  console.log('Creando permisos...');
  const permisosData = [
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
      descripcion: 'Desactivar/dar de baja usuarios',
    },
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
    {
      modulo: 'Roles',
      clave: 'roles.eliminar',
      descripcion: 'Eliminar roles dinamicos',
    },
    {
      modulo: 'Examenes',
      clave: 'examenes.ver',
      descripcion: 'Ver listado de examenes',
    },
    {
      modulo: 'Examenes',
      clave: 'examenes.crear',
      descripcion: 'Crear nuevos examenes',
    },
    {
      modulo: 'Examenes',
      clave: 'examenes.editar',
      descripcion: 'Editar examenes',
    },
    {
      modulo: 'Examenes',
      clave: 'examenes.eliminar',
      descripcion: 'Eliminar examenes',
    },
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.ver',
      descripcion: 'Ver listado de estudiantes',
    },
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.cargar',
      descripcion: 'Cargar padron de estudiantes',
    },
    {
      modulo: 'Estudiantes',
      clave: 'estudiantes.habilitar',
      descripcion: 'Habilitar/inhabilitar estudiantes',
    },
    {
      modulo: 'Auditoria',
      clave: 'auditoria.ver',
      descripcion: 'Ver bitacora de auditoria',
    },
    {
      modulo: 'Ambientes',
      clave: 'ambientes.ver',
      descripcion: 'Ver listado de ambientes',
    },
    {
      modulo: 'Ambientes',
      clave: 'ambientes.editar',
      descripcion: 'Editar ambientes (Admin)',
    },
    {
      modulo: 'Ambientes',
      clave: 'ambientes.registrar_reserva',
      descripcion: 'Registrar reserva de ambiente (Docente)',
    },
    {
      modulo: 'Ambientes',
      clave: 'ambientes.cancelar_reserva',
      descripcion: 'Cancelar reserva de ambiente (Docente)',
    },
    {
      modulo: 'Portal Estudiante',
      clave: 'portal_estudiante.ver_examenes',
      descripcion: 'Ver examenes habilitados (Estudiante)',
    },
    {
      modulo: 'Portal Estudiante',
      clave: 'portal_estudiante.generar_qr',
      descripcion: 'Generar codigo QR de ingreso (Estudiante)',
    },
    {
      modulo: 'Control de ingreso',
      clave: 'control_ingreso.ver_examenes_asignados',
      descripcion: 'Ver examenes asignados (Control)',
    },
    {
      modulo: 'Control de ingreso',
      clave: 'control_ingreso.escanear_qr',
      descripcion: 'Escanear QR de estudiantes (Control)',
    },
    {
      modulo: 'Control de ingreso',
      clave: 'control_ingreso.registro_manual',
      descripcion: 'Registro manual de ingreso (Control)',
    },
    {
      modulo: 'Registro de ingresos',
      clave: 'registro_ingresos.ver',
      descripcion: 'Ver lista de ingresos del examen',
    },
    {
      modulo: 'Incidencias',
      clave: 'incidencias.ver',
      descripcion: 'Ver incidencias del examen',
    },
    {
      modulo: 'Incidencias',
      clave: 'incidencias.registrar',
      descripcion: 'Registrar incidencias de ingreso',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.ver',
      descripcion: 'Ver nomina de colaboradores (Docente)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.solicitar',
      descripcion: 'Solicitar colaborador (Docente)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.asignar_examen',
      descripcion: 'Asignar colaborador a examen (Docente)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.desasignar_examen',
      descripcion: 'Desasignar colaborador de examen (Docente)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.dar_de_baja',
      descripcion: 'Dar de baja colaborador de la nomina (Docente)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.ver_solicitudes',
      descripcion: 'Ver solicitudes de colaboracion (Administrador)',
    },
    {
      modulo: 'Colaboradores',
      clave: 'colaboradores.aprobar',
      descripcion: 'Aprobar/rechazar solicitudes (Administrador)',
    },
  ];
  const permisoMap: Record<string, number> = {};
  for (const p of permisosData) {
    const perm = await prisma.permiso.create({
      data: {
        moduloId: moduloMap[p.modulo],
        clave: p.clave,
        descripcion: p.descripcion,
      },
    });
    permisoMap[p.clave] = perm.id;
  }
  console.log(`OK: ${permisosData.length} permisos creados.`);

  // 2.4 Roles base (es_plantilla = true)
  console.log('Creando roles base...');

  const permisosAdmin = Object.keys(permisoMap);
  const permisosDocente = [
    'examenes.ver',
    'examenes.crear',
    'examenes.editar',
    'examenes.eliminar',
    'estudiantes.ver',
    'estudiantes.cargar',
    'estudiantes.habilitar',
    'ambientes.ver',
    'ambientes.registrar_reserva',
    'ambientes.cancelar_reserva',
    'colaboradores.ver',
    'colaboradores.solicitar',
    'colaboradores.asignar_examen',
    'colaboradores.desasignar_examen',
    'colaboradores.dar_de_baja',
    'registro_ingresos.ver',
    'incidencias.ver',
  ];
  const permisosControl = [
    'control_ingreso.ver_examenes_asignados',
    'control_ingreso.escanear_qr',
    'control_ingreso.registro_manual',
    'registro_ingresos.ver',
    'incidencias.ver',
    'incidencias.registrar',
  ];
  const permisosEstudiante = [
    'portal_estudiante.ver_examenes',
    'portal_estudiante.generar_qr',
  ];

  const rolAdmin = await prisma.rol.create({
    data: {
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      esPlantilla: true,
      permisos: {
        create: permisosAdmin.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: Object.values(moduloMap).map((id) => ({ moduloId: id })),
      },
    },
  });
  const rolDocente = await prisma.rol.create({
    data: {
      nombre: 'Docente',
      descripcion: 'Gestion de examenes y estudiantes',
      esPlantilla: true,
      permisos: {
        create: permisosDocente.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: [
          ...new Set(
            permisosDocente.map((c) => {
              const p = permisosData.find((x) => x.clave === c)!;
              return moduloMap[p.modulo];
            }),
          ),
        ].map((id) => ({ moduloId: id })),
      },
    },
  });
  const rolControl = await prisma.rol.create({
    data: {
      nombre: 'Personal de control',
      descripcion: 'Control de ingreso a examenes',
      esPlantilla: true,
      permisos: {
        create: permisosControl.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: [
          ...new Set(
            permisosControl.map((c) => {
              const p = permisosData.find((x) => x.clave === c)!;
              return moduloMap[p.modulo];
            }),
          ),
        ].map((id) => ({ moduloId: id })),
      },
    },
  });
  const rolEstudiante = await prisma.rol.create({
    data: {
      nombre: 'Estudiante',
      descripcion: 'Acceso al portal estudiantil',
      esPlantilla: true,
      permisos: {
        create: permisosEstudiante.map((c) => ({ permisoId: permisoMap[c] })),
      },
      modulos: {
        create: [
          ...new Set(
            permisosEstudiante.map((c) => {
              const p = permisosData.find((x) => x.clave === c)!;
              return moduloMap[p.modulo];
            }),
          ),
        ].map((id) => ({ moduloId: id })),
      },
    },
  });
  console.log(`OK: Roles base creados (Admin, Docente, Control, Estudiante).`);
  void rolAdmin;

  // 2.5 Usuarios del sistema
  console.log('Creando usuarios del sistema...');
  const adminUser = await prisma.usuario.create({
    data: {
      nombre: 'Admin',
      apellido: 'ExaControl',
      correo: 'admin@exacontrol.com',
      password: passwordHash,
      roles: { create: [{ rolId: rolAdmin.id }] },
    },
  });
  const controlUser1 = await prisma.usuario.create({
    data: {
      nombre: 'Juan',
      apellido: 'Perez Condori',
      correo: 'j.perez@umss.edu.bo',
      password: passwordHash,
      roles: { create: [{ rolId: rolControl.id }] },
    },
  });
  const controlUser2 = await prisma.usuario.create({
    data: {
      nombre: 'Maria',
      apellido: 'Lopez Quispe',
      correo: 'm.lopez@umss.edu.bo',
      password: passwordHash,
      roles: { create: [{ rolId: rolControl.id }] },
    },
  });
  void controlUser2;
  console.log('OK: Usuarios del sistema creados.\n');

  // 2.6 HorarioFijo (malla horaria institucional UMSS)
  console.log('Creando horarios fijos...');
  const horarioFijoData = [
    {
      periodoNombre: 'Periodo 1',
      horaIni: new Date('1970-01-01T06:45:00Z'),
      horaFin: new Date('1970-01-01T08:15:00Z'),
    },
    {
      periodoNombre: 'Periodo 2',
      horaIni: new Date('1970-01-01T08:15:00Z'),
      horaFin: new Date('1970-01-01T09:45:00Z'),
    },
    {
      periodoNombre: 'Periodo 3',
      horaIni: new Date('1970-01-01T09:45:00Z'),
      horaFin: new Date('1970-01-01T11:15:00Z'),
    },
    {
      periodoNombre: 'Periodo 4',
      horaIni: new Date('1970-01-01T11:15:00Z'),
      horaFin: new Date('1970-01-01T12:45:00Z'),
    },
    {
      periodoNombre: 'Periodo 5',
      horaIni: new Date('1970-01-01T12:45:00Z'),
      horaFin: new Date('1970-01-01T14:15:00Z'),
    },
    {
      periodoNombre: 'Periodo 6',
      horaIni: new Date('1970-01-01T14:15:00Z'),
      horaFin: new Date('1970-01-01T15:45:00Z'),
    },
    {
      periodoNombre: 'Periodo 7',
      horaIni: new Date('1970-01-01T15:45:00Z'),
      horaFin: new Date('1970-01-01T17:15:00Z'),
    },
    {
      periodoNombre: 'Periodo 8',
      horaIni: new Date('1970-01-01T17:15:00Z'),
      horaFin: new Date('1970-01-01T18:45:00Z'),
    },
    {
      periodoNombre: 'Periodo 9',
      horaIni: new Date('1970-01-01T18:45:00Z'),
      horaFin: new Date('1970-01-01T20:15:00Z'),
    },
    {
      periodoNombre: 'Periodo 10',
      horaIni: new Date('1970-01-01T20:15:00Z'),
      horaFin: new Date('1970-01-01T21:45:00Z'),
    },
  ];
  const horarioFijoMap: Record<string, number> = {};
  for (const h of horarioFijoData) {
    const hf = await prisma.horarioFijo.create({ data: h });
    horarioFijoMap[h.periodoNombre] = hf.id;
  }
  console.log(`OK: ${horarioFijoData.length} horarios fijos creados.\n`);

  // 2.7 Facultades, Carreras, Materias y Ambientes
  console.log('Creando estructura academica UMSS...');
  const facultadMap: Record<string, number> = {};
  const carreraMap: Record<string, number> = {};
  const materiaMap: Record<string, number> = {};
  const ambientesPorFacultad: Record<string, number[]> = {};
  const tipoAulaMap: Record<string, number> = {};

  for (const tipo of [
    'Aula',
    'Laboratorio',
    'Auditorio',
    'Sala de conferencias',
  ]) {
    const t = await prisma.tipoAula.create({ data: { nombre: tipo } });
    tipoAulaMap[tipo] = t.id;
  }

  for (const fac of FACULTADES_DATA) {
    const facultad = await prisma.facultad.create({
      data: { nombre: fac.nombre },
    });
    facultadMap[fac.nombre] = facultad.id;
    ambientesPorFacultad[fac.nombre] = [];

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

    for (const car of fac.carreras) {
      const carrera = await prisma.carrera.create({
        data: { nombre: car.nombre, facultadId: facultad.id },
      });
      carreraMap[car.nombre] = carrera.id;

      for (const mat of car.materias) {
        let materia = await prisma.materia.findFirst({
          where: { sigla: mat.sigla },
        });
        if (!materia) {
          materia = await prisma.materia.create({
            data: { sigla: mat.sigla, nombre: mat.nombre },
          });
        }
        materiaMap[mat.sigla] = materia.id;
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
    console.log(`  OK: ${fac.nombre}`);
  }
  console.log('OK: Estructura academica creada.\n');

  // 2.8 Docentes
  console.log('Creando docentes...');
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
    for (const carNombre of doc.carreras) {
      const carId = carreraMap[carNombre];
      if (carId) {
        await prisma.usuario_Alcance.create({
          data: { usuarioId: docente.id, facultadId: facId, carreraId: carId },
        });
      }
    }
  }
  console.log('OK: Docentes creados.\n');

  // 2.9 Estudiantes con cuentas de Usuario (Sprint 2)
  console.log('Creando estudiantes con cuentas de usuario...');
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
    const ciHash = await bcrypt.hash(est.ci, 10);
    // DEV: correo temporal para poder usar el flujo email estandar en testing
    // PROD: el login real sera por cod_sis + CI (endpoint dedicado a implementar)
    const usuarioEst = await prisma.usuario.create({
      data: {
        nombre: est.nombre,
        apellido: est.apellido,
        correo: `${est.cod_sis}@est.umss.edu.bo`,
        password: ciHash,
        roles: { create: [{ rolId: rolEstudiante.id }] },
      },
    });
    const estudiante = await prisma.estudiante.create({
      data: {
        cod_sis: est.cod_sis,
        nombre: est.nombre,
        apellido: est.apellido,
        ci: est.ci,
        cargaId: carga.id,
        usuarioId: usuarioEst.id,
      },
    });
    estudianteMap[est.cod_sis] = estudiante.id;
  }
  console.log(
    `OK: ${ESTUDIANTES_DATA.length} estudiantes con cuentas creados.\n`,
  );

  // 2.10 Examenes y reservas
  console.log('Creando examenes con reservas...');
  const ahora = new Date();
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  const manana = new Date(ahora);
  manana.setDate(ahora.getDate() + 1);
  const pasado = new Date(ahora);
  pasado.setDate(ahora.getDate() + 2);
  const hace3Dias = new Date(ahora);
  hace3Dias.setDate(ahora.getDate() - 3);
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

  const ambFCyT =
    ambientesPorFacultad['Facultad de Ciencias y Tecnología (FCyT)'] ??
    ambientesPorFacultad[
      Object.keys(ambientesPorFacultad).find((k) => k.includes('FCyT')) ?? ''
    ] ??
    [];
  const ambFCE =
    ambientesPorFacultad[
      Object.keys(ambientesPorFacultad).find((k) => k.includes('FCE')) ?? ''
    ] ?? [];
  const ambFCJP =
    ambientesPorFacultad[
      Object.keys(ambientesPorFacultad).find((k) => k.includes('FCJP')) ?? ''
    ] ?? [];
  const ambFHCE =
    ambientesPorFacultad[
      Object.keys(ambientesPorFacultad).find((k) => k.includes('FHCE')) ?? ''
    ] ?? [];
  void ambFCE;
  void ambFCJP;
  void ambFHCE;

  const docVlad = docenteUsuarios['vl.costas@umss.edu.bo'];
  const docMiriam = docenteUsuarios['mi.morales@umss.edu.bo'];
  const docEdgar = docenteUsuarios['ed.flores@umss.edu.bo'];
  const docRosario = docenteUsuarios['ro.arteaga@umss.edu.bo'];
  const docCarlos = docenteUsuarios['ca.penaranda@umss.edu.bo'];
  const docPatricia = docenteUsuarios['pa.burgoa@umss.edu.bo'];
  const docMarco = docenteUsuarios['ma.quiroga@umss.edu.bo'];
  const docAna = docenteUsuarios['an.sejas@umss.edu.bo'];
  const docRamiro = docenteUsuarios['ra.zapata@umss.edu.bo'];
  void docRosario;
  void docCarlos;
  void docPatricia;
  void docMarco;
  void docAna;
  void docRamiro;

  // Examen 1 - PROGRAMADO (hoy) - Vladimir - BD1
  // NOTA: el estado EN_CURSO lo calcula el sistema segun hora actual vs HorarioFijo
  const reserva1 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[0],
      docenteId: docVlad,
      horarioFijoId: horarioFijoMap['Periodo 2'],
      fecha: ahora,
      estado: 'RESERVADO',
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
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen1.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['BD1'],
    },
  });
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
  // Simular ingresos para los primeros 6 (examen de hoy)
  for (const cod of sistStudents.slice(0, 6)) {
    await prisma.ingreso.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen1.id,
        fechaHora: ahora,
        metodo: 'QR',
        registradoPor: controlUser1.id,
        esOffline: false,
      },
    });
  }

  // Examen 2 - PROGRAMADO (manana) - Miriam - ISW1
  const reserva2 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[2],
      docenteId: docMiriam,
      horarioFijoId: horarioFijoMap['Periodo 3'],
      fecha: manana,
      estado: 'RESERVADO',
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
  for (const cod of [
    '202001001',
    '202001002',
    '202001003',
    '202101010',
    '202101011',
    '202101012',
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen2.id,
        estado_habilitado: true,
      },
    });
  }

  // Examen 3 - PROGRAMADO (pasado manana) - Edgar - REDES
  const reserva3 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[1],
      docenteId: docEdgar,
      horarioFijoId: horarioFijoMap['Periodo 6'],
      fecha: pasado,
      estado: 'RESERVADO',
    },
  });
  const examen3 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva3.id,
      usuarioId: docEdgar,
      tipoExamen: 'Final',
      normasEx:
        'Examen de libro cerrado. Calculadora permitida. Presentar carnet.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen3.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['REDES'],
    },
  });
  for (const cod of [
    '202001001',
    '202001002',
    '202001003',
    '202101013',
    '202101014',
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen3.id,
        estado_habilitado: true,
      },
    });
  }

  // Examen 4 - FINALIZADO (hace 3 dias) - Vladimir - ALG
  const reserva4 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[0],
      docenteId: docVlad,
      horarioFijoId: horarioFijoMap['Periodo 8'],
      fecha: hace3Dias,
      estado: 'FINALIZADO',
    },
  });
  const examen4 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva4.id,
      usuarioId: docVlad,
      tipoExamen: 'Primer parcial',
      normasEx: 'Examen de laboratorio. Prohibido el uso de internet.',
      estadoExamId: 2,
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
  for (const cod of [
    '201901234',
    '201901235',
    '201901236',
    '201901237',
    '201901238',
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen4.id,
        estado_habilitado: true,
      },
    });
  }
  await prisma.examen_Estudiante
    .create({
      data: {
        estudianteId: estudianteMap['201901234'],
        examenId: examen4.id,
        estado_habilitado: false,
        motivo_inhabilitacion: 'No entrego trabajo previo',
      },
    })
    .catch(() => {});

  // Examen 5 - PROGRAMADO (d3) - Miriam - ISW2 (con fue_editado=true)
  const reserva5 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[2],
      docenteId: docMiriam,
      horarioFijoId: horarioFijoMap['Periodo 1'],
      fecha: d3,
      estado: 'RESERVADO',
    },
  });
  const examen5 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva5.id,
      usuarioId: docMiriam,
      tipoExamen: 'Segundo parcial',
      normasEx: 'Hoja de notas permitida.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
      fueEditado: true,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen5.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['ISW2'],
    },
  });
  // Examen 5 estudiantes — Informática (ISW2, en 3 días)
  for (const cod of [
    '202001001',
    '202001002',
    '202101010',
    '202101011',
    '202101012',
    '202101013',
    '202001050', // Informatica
    '202001051',
    '202001052',
    '202001053',
    '202001054',
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen5.id,
        estado_habilitado: true,
      },
    });
  }
  // Un inhabilitado en examen5 (no presentó práctica)
  await prisma.examen_Estudiante
    .create({
      data: {
        estudianteId: estudianteMap['202001054'],
        examenId: examen5.id,
        estado_habilitado: false,
        motivo_inhabilitacion: 'No aprobó el trabajo práctico previo',
      },
    })
    .catch(() => {});

  // Examen 7 - PROGRAMADO (d4) - Rosario Arteaga - FCE - ECON1
  // Cubre a los 5 estudiantes de FCE
  const reserva7 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId:
        ambientesPorFacultad[
          Object.keys(ambientesPorFacultad).find((k) => k.includes('FCE')) ?? ''
        ]?.[0] ?? ambFCyT[0],
      docenteId: docenteUsuarios['ro.arteaga@umss.edu.bo'],
      horarioFijoId: horarioFijoMap['Periodo 4'],
      fecha: d4,
      estado: 'RESERVADO',
    },
  });
  const examen7 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva7.id,
      usuarioId: docenteUsuarios['ro.arteaga@umss.edu.bo'],
      tipoExamen: 'Primer parcial',
      normasEx:
        'Calculadora permitida. Solo modelos no programables. Presentar carnet.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen7.id,
      carreraId: carreraMap['Administración de Empresas'],
      materiaId: materiaMap['ADM1'],
    },
  });
  for (const cod of [
    '202000100', // Valentina
    '202000101', // Nicolas
    '202000102', // Mariana
    '202000103', // Claudio
    '202000104', // Paulina
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen7.id,
        estado_habilitado: true,
      },
    });
  }

  // Examen 8 - PROGRAMADO (d5) - Patricia Burgoa - FHCE - PSI1
  // Cubre a los 3 estudiantes de FHCE
  const reserva8 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId:
        ambientesPorFacultad[
          Object.keys(ambientesPorFacultad).find((k) => k.includes('FHCE')) ??
            ''
        ]?.[0] ?? ambFCyT[0],
      docenteId: docenteUsuarios['pa.burgoa@umss.edu.bo'],
      horarioFijoId: horarioFijoMap['Periodo 5'],
      fecha: d5,
      estado: 'RESERVADO',
    },
  });
  const examen8 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva8.id,
      usuarioId: docenteUsuarios['pa.burgoa@umss.edu.bo'],
      tipoExamen: 'Segundo parcial',
      normasEx: 'Material de consulta permitido. Traer lapicero azul.',
      estadoExamId: 1,
      estado: EstadoExamen.PROGRAMADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen8.id,
      carreraId: carreraMap['Psicología'],
      materiaId: materiaMap['PSI-GEN'],
    },
  });
  for (const cod of [
    '202100200', // Elena
    '202100201', // Marcos
    '202100202', // Cindy
  ]) {
    await prisma.examen_Estudiante.create({
      data: {
        estudianteId: estudianteMap[cod],
        examenId: examen8.id,
        estado_habilitado: true,
      },
    });
  }
  // Un inhabilitado en examen8
  await prisma.examen_Estudiante
    .create({
      data: {
        estudianteId: estudianteMap['202100201'], // Marcos
        examenId: examen8.id,
        estado_habilitado: false,
        motivo_inhabilitacion: 'Reprobó la evaluación continua',
      },
    })
    .catch(() => {});

  console.log('OK: Estudiantes habilitados en todos los examenes.\\n');

  // Examen 6 - CANCELADO (ayer) - Vladimir - ALG (reserva cancelada)
  const reserva6 = await prisma.reservaAmbiente.create({
    data: {
      ambienteId: ambFCyT[0],
      docenteId: docVlad,
      horarioFijoId: horarioFijoMap['Periodo 2'],
      fecha: ayer,
      estado: 'CANCELADO',
    },
  });
  const examen6 = await prisma.examen.create({
    data: {
      reservaAmbienteId: reserva6.id,
      usuarioId: docVlad,
      tipoExamen: 'Recuperatorio',
      normasEx: 'Cancelado por fuerza mayor.',
      estadoExamId: 1,
      estado: EstadoExamen.CANCELADO,
    },
  });
  await prisma.examen_Carrera_Materia.create({
    data: {
      examenId: examen6.id,
      carreraId: carreraMap['Ingeniería de Sistemas'],
      materiaId: materiaMap['ALG'],
    },
  });
  void examen6;

  // Reservas libres (sin examen asociado)
  for (const fecha of [d4, d5, d7, d10, d14]) {
    await prisma.reservaAmbiente.create({
      data: {
        ambienteId: ambFCyT[0],
        docenteId: docVlad,
        horarioFijoId: horarioFijoMap['Periodo 3'],
        fecha,
        estado: 'RESERVADO',
      },
    });
  }
  console.log('OK: Examenes y reservas creados.\n');

  // 2.11 DocenteColaborador
  console.log('Creando relaciones colaborador...');
  await prisma.docenteColaborador.create({
    data: {
      docenteId: docVlad,
      colaboradorId: controlUser1.id,
      estadoSolicitud: 'APROBADO',
      aprobadoPor: adminUser.id,
      correoSolicitado: 'j.perez@umss.edu.bo',
      fechaSolicitud: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000),
      fechaRespuesta: new Date(ahora.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.docenteColaborador.create({
    data: {
      docenteId: docVlad,
      colaboradorId: controlUser2.id,
      estadoSolicitud: 'PENDIENTE',
      correoSolicitado: 'm.lopez@umss.edu.bo',
      fechaSolicitud: new Date(),
    },
  });
  await prisma.docenteColaborador.create({
    data: {
      docenteId: docMiriam,
      colaboradorId: controlUser1.id,
      estadoSolicitud: 'APROBADO',
      aprobadoPor: adminUser.id,
      correoSolicitado: 'j.perez@umss.edu.bo',
      fechaSolicitud: new Date(ahora.getTime() - 5 * 24 * 60 * 60 * 1000),
      fechaRespuesta: new Date(ahora.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // 2.12 ExamenControlador
  await prisma.examenControlador.create({
    data: {
      examenId: examen1.id,
      colaboradorId: controlUser1.id,
      asignadoPor: docVlad,
      rolAsignacion: 'Control principal',
    },
  });
  await prisma.examenControlador.create({
    data: {
      examenId: examen3.id,
      colaboradorId: controlUser1.id,
      asignadoPor: docEdgar,
      rolAsignacion: 'Apoyo de ingreso',
    },
  });
  console.log('OK: Relaciones colaborador creadas.\n');

  // 2.13 Codigos QR de prueba
  console.log('Creando codigos QR de prueba...');
  const ahora2 = new Date();
  await prisma.codigoQr.create({
    data: {
      estudianteId: estudianteMap['201901234'],
      token: 'qr_test_alejandro_bd1_a1b2c3d4e5f6',
      generadoEn: ahora2,
      expiraEn: new Date(ahora2.getTime() + 5 * 60 * 1000),
    },
  });
  await prisma.codigoQr.create({
    data: {
      estudianteId: estudianteMap['201901235'],
      token: 'qr_test_gabriela_expirado_zz9988aa77',
      generadoEn: new Date(ahora2.getTime() - 10 * 60 * 1000),
      expiraEn: new Date(ahora2.getTime() - 5 * 60 * 1000),
    },
  });
  console.log('OK: Codigos QR creados.\n');

  // 2.14 Incidencias de ingreso de prueba
  console.log('Creando incidencias de prueba...');
  await prisma.incidenciaIngreso.create({
    data: {
      examenId: examen1.id,
      registradoPor: controlUser1.id,
      estudianteId: estudianteMap['202100200'],
      codSisIngresado: '202100200',
      tipoIncidencia: 'NO_HABILITADO',
      descripcion:
        'Estudiante no figura en la lista habilitada para el examen de BD1.',
      fechaHora: new Date(ahora.getTime() + 15 * 60 * 1000),
    },
  });
  await prisma.incidenciaIngreso.create({
    data: {
      examenId: examen1.id,
      registradoPor: controlUser1.id,
      estudianteId: null,
      codSisIngresado: '202199999',
      ciIngresado: '1234567',
      nombreReferencial: 'Carlos Gomez Pena',
      tipoIncidencia: 'NO_ENCONTRADO',
      descripcion: 'Codigo SIS no encontrado. Datos ingresados manualmente.',
      fechaHora: new Date(ahora.getTime() + 22 * 60 * 1000),
    },
  });
  await prisma.incidenciaIngreso.create({
    data: {
      examenId: examen1.id,
      registradoPor: controlUser1.id,
      estudianteId: estudianteMap['201901235'],
      codSisIngresado: '201901235',
      tipoIncidencia: 'QR_CADUCADO',
      descripcion: 'El QR presentado expiro hace mas de 5 minutos.',
      fechaHora: new Date(ahora.getTime() + 30 * 60 * 1000),
    },
  });
  await prisma.incidenciaIngreso.create({
    data: {
      examenId: examen1.id,
      registradoPor: controlUser1.id,
      estudianteId: estudianteMap['201901234'],
      codSisIngresado: '201901234',
      tipoIncidencia: 'DOBLE_MARCACION',
      descripcion: 'El QR ya fue escaneado. Posible intento de doble ingreso.',
      fechaHora: new Date(ahora.getTime() + 45 * 60 * 1000),
    },
  });
  await prisma.incidenciaIngreso.create({
    data: {
      examenId: examen4.id,
      registradoPor: controlUser1.id,
      estudianteId: estudianteMap['201901236'],
      codSisIngresado: '201901236',
      ciIngresado: '0000000',
      tipoIncidencia: 'IDENTIDAD_NO_COINCIDE',
      descripcion:
        'El carnet presentado no corresponde al codigo SIS ingresado.',
      fechaHora: new Date(hace3Dias.getTime() + 10 * 60 * 1000),
    },
  });
  console.log('OK: Incidencias creadas.\n');

  // Resumen final
  console.log('='.repeat(60));
  console.log('SEED UMSS SPRINT 2 COMPLETADO');
  console.log('='.repeat(60));
  console.log(`Contrasena usuarios sistema/docentes: ${PASSWORD}`);
  console.log('Contrasena estudiantes: su CI');
  console.log('Login DEV estudiantes: {cod_sis}@est.umss.edu.bo / CI');
  console.log('');
  console.log('Usuarios del sistema:');
  console.log('  Admin:    admin@exacontrol.com');
  console.log('  Control1: j.perez@umss.edu.bo');
  console.log('  Control2: m.lopez@umss.edu.bo');
  console.log('');
  console.log('Roles base (es_plantilla=true):');
  console.log(
    '  1. Administrador  2. Docente  3. Personal de control  4. Estudiante',
  );
  console.log('');
  console.log(
    'Examenes: 3 PROGRAMADOS (1 hoy+2 futuros), 1 FINALIZADO, 1 CANCELADO, 1 PROGRAMADO-EDITADO',
  );
  console.log('QR de prueba: 1 activo (Alejandro), 1 expirado (Gabriela)');
  console.log(
    'Incidencias: 5 (NO_HABILITADO, NO_ENCONTRADO, QR_CADUCADO, DOBLE_MARCACION, IDENTIDAD_NO_COINCIDE)',
  );
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('ERROR en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
