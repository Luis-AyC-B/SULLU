import {
  Colaborador,
  ExamenItem,
  SolicitudColaboradorInput,
  EstudianteRegistrado,
} from "../schemas/colaborador.schema";

const STORAGE_KEY_COLABORADORES = "exacontrol_colaboradores_v3";
const STORAGE_KEY_EXAMENES = "exacontrol_examenes_colaboradores_v3";

const DEFAULT_DOCENTE_EMAIL = "docente@umss.edu";

// Base de datos de Estudiantes Registrados en el sistema UMSS (Tabla Estudiante)
export const ESTUDIANTES_REGISTRADOS_DB: EstudianteRegistrado[] = [
  {
    id: 1,
    codSis: "202100123",
    nombre: "Diego",
    apellido: "Salazar",
    email: "diego.salazar@umss.edu.bo",
    carrera: "Licenciatura en Informática",
  },
  {
    id: 2,
    codSis: "202110234",
    nombre: "Ana Lucía",
    apellido: "Rojas",
    email: "ana.rojas@umss.edu.bo",
    carrera: "Ingeniería de Sistemas",
  },
  {
    id: 3,
    codSis: "202008711",
    nombre: "Carlos",
    apellido: "Vargas",
    email: "carlos.vargas@umss.edu.bo",
    carrera: "Ingeniería Informática",
  },
  {
    id: 4,
    codSis: "202211582",
    nombre: "María Fernanda",
    apellido: "López",
    email: "maria.lopez@umss.edu.bo",
    carrera: "Ingeniería de Sistemas",
  },
  {
    id: 5,
    codSis: "202005819",
    nombre: "Valeria",
    apellido: "Quiroga",
    email: "valeria.quiroga@umss.edu.bo",
    carrera: "Licenciatura en Biología",
  },
  {
    id: 6,
    codSis: "201904512",
    nombre: "Jorge",
    apellido: "Álvarez",
    email: "jorge.alvarez@umss.edu.bo",
    carrera: "Ingeniería Civil",
  },
  {
    id: 7,
    codSis: "202201984",
    nombre: "Lucía",
    apellido: "Camacho",
    email: "lucia.camacho@umss.edu.bo",
    carrera: "Ingeniería de Sistemas",
  },
  {
    id: 8,
    codSis: "202301456",
    nombre: "Alejandro",
    apellido: "Torres",
    email: "alejandro.torres@umss.edu.bo",
    carrera: "Ingeniería Industrial",
  },
  {
    id: 9,
    codSis: "202105678",
    nombre: "Camila",
    apellido: "Mendoza",
    email: "camila.mendoza@umss.edu.bo",
    carrera: "Licenciatura en Matemáticas",
  },
  {
    id: 10,
    codSis: "202003412",
    nombre: "Rodrigo",
    apellido: "Paz",
    email: "rodrigo.paz@umss.edu.bo",
    carrera: "Ingeniería Electrónica",
  },
  {
    id: 11,
    codSis: "202207890",
    nombre: "Natalia",
    apellido: "Morales",
    email: "natalia.morales@umss.edu.bo",
    carrera: "Licenciatura en Informática",
  },
  {
    id: 12,
    codSis: "202309123",
    nombre: "Mateo",
    apellido: "Gutiérrez",
    email: "mateo.gutierrez@umss.edu.bo",
    carrera: "Ingeniería de Sistemas",
  },
];

// Colaboradores iniciales con su Código SIS correspondiente
const COLABORADORES_DEFAULT: Colaborador[] = [
  {
    id: 1,
    codSis: "202100123",
    nombre: "Diego",
    apellido: "Salazar",
    nombres: "Diego",
    apellidos: "Salazar",
    nombreCompleto: "Diego Salazar",
    email: "diego.salazar@umss.edu.bo",
    estado: "APROBADO",
    fechaSolicitud: "05 oct 2026",
    examenesAsignadosIds: [101, 102],
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
    docenteNombre: "Luis Medina",
    aprobadoPor: "Admin",
    fechaRespuesta: "07 oct 2026",
    rol: "Personal de control",
  },
  {
    id: 2,
    codSis: "202110234",
    nombre: "Ana Lucía",
    apellido: "Rojas",
    nombres: "Ana Lucía",
    apellidos: "Rojas",
    nombreCompleto: "Ana Lucía Rojas",
    email: "ana.rojas@umss.edu.bo",
    estado: "PENDIENTE",
    fechaSolicitud: "10 oct 2026",
    examenesAsignadosIds: [],
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
    docenteNombre: "Luis Medina",
    aprobadoPor: "—",
    fechaRespuesta: "—",
  },
  {
    id: 3,
    codSis: "202008711",
    nombre: "Carlos",
    apellido: "Vargas",
    nombres: "Carlos",
    apellidos: "Vargas",
    nombreCompleto: "Carlos Vargas",
    email: "carlos.vargas@umss.edu.bo",
    estado: "PENDIENTE",
    fechaSolicitud: "09 oct 2026",
    examenesAsignadosIds: [],
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
    docenteNombre: "Luis Medina",
    aprobadoPor: "—",
    fechaRespuesta: "—",
  },
  {
    id: 4,
    codSis: "202211582",
    nombre: "María Fernanda",
    apellido: "López",
    nombres: "María Fernanda",
    apellidos: "López",
    nombreCompleto: "María Fernanda López",
    email: "maria.lopez@umss.edu.bo",
    estado: "PENDIENTE",
    fechaSolicitud: "08 oct 2026",
    examenesAsignadosIds: [],
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
    docenteNombre: "Luis Medina",
    aprobadoPor: "—",
    fechaRespuesta: "—",
  },
  {
    id: 5,
    codSis: "202005819",
    nombre: "Valeria",
    apellido: "Quiroga",
    nombres: "Valeria",
    apellidos: "Quiroga",
    nombreCompleto: "Valeria Quiroga",
    email: "valeria.quiroga@umss.edu.bo",
    estado: "RECHAZADO",
    fechaSolicitud: "04 oct 2026",
    examenesAsignadosIds: [],
    docenteEmail: "elena.paredes@umss.edu",
    docenteNombre: "Elena Paredes",
    aprobadoPor: "—",
    fechaRespuesta: "06 oct 2026",
  },
  {
    id: 6,
    codSis: "201904512",
    nombre: "Jorge",
    apellido: "Álvarez",
    nombres: "Jorge",
    apellidos: "Álvarez",
    nombreCompleto: "Jorge Álvarez",
    email: "jorge.alvarez@umss.edu.bo",
    estado: "INACTIVO",
    fechaSolicitud: "30 sep 2026",
    examenesAsignadosIds: [],
    docenteEmail: "elena.paredes@umss.edu",
    docenteNombre: "Elena Paredes",
    aprobadoPor: "Admin",
    fechaRespuesta: "02 oct 2026",
    rol: "Personal de control",
  },
  {
    id: 7,
    codSis: "202201984",
    nombre: "Lucía",
    apellido: "Camacho",
    nombres: "Lucía",
    apellidos: "Camacho",
    nombreCompleto: "Lucía Camacho",
    email: "lucia.camacho@umss.edu.bo",
    estado: "APROBADO",
    fechaSolicitud: "28 sep 2026",
    examenesAsignadosIds: [101, 103],
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
    docenteNombre: "Luis Medina",
    aprobadoPor: "Admin",
    fechaRespuesta: "01 oct 2026",
    rol: "Personal de control",
  },
];

// Pool de exámenes del docente según mockup
const EXAMENES_DOCENTE_DEFAULT: ExamenItem[] = [
  {
    id: 101,
    materia: "Cálculo I",
    parcial: "Parcial 2",
    fecha: "14 oct 2026",
    fechaIso: "2026-10-14",
    periodo: "Período 2",
    horario: "08:15–09:45",
    ubicacion: "Aula 204 · Bloque A",
    yaInicio: false,
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
  },
  {
    id: 102,
    materia: "Álgebra I",
    parcial: "Parcial 2",
    fecha: "10 oct 2026",
    fechaIso: "2026-10-10",
    periodo: "Período 2",
    horario: "08:15–09:45",
    ubicacion: "Aula 102 · Bloque B",
    yaInicio: true, // El examen ya inició
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
  },
  {
    id: 103,
    materia: "Física I",
    parcial: "Parcial 2",
    fecha: "15 oct 2026",
    fechaIso: "2026-10-15",
    periodo: "Período 2",
    horario: "08:15–09:45",
    ubicacion: "Laboratorio 3 · Bloque C",
    yaInicio: false,
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
  },
  {
    id: 104,
    materia: "Estadística I",
    parcial: "Parcial 2",
    fecha: "14 oct 2026",
    fechaIso: "2026-10-14",
    periodo: "Período 2",
    horario: "08:15–09:45",
    ubicacion: "Aula 206 · Bloque A",
    yaInicio: false,
    docenteEmail: DEFAULT_DOCENTE_EMAIL,
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getStoredColaboradores(): Colaborador[] {
  if (typeof window === "undefined") return COLABORADORES_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLABORADORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_COLABORADORES, JSON.stringify(COLABORADORES_DEFAULT));
      return COLABORADORES_DEFAULT;
    }
    return JSON.parse(raw);
  } catch {
    return COLABORADORES_DEFAULT;
  }
}

function saveStoredColaboradores(colaboradores: Colaborador[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_COLABORADORES, JSON.stringify(colaboradores));
  } catch (error) {
    console.error("Error guardando colaboradores:", error);
  }
}

function getStoredExamenes(): ExamenItem[] {
  if (typeof window === "undefined") return EXAMENES_DOCENTE_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXAMENES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EXAMENES, JSON.stringify(EXAMENES_DOCENTE_DEFAULT));
      return EXAMENES_DOCENTE_DEFAULT;
    }
    return JSON.parse(raw);
  } catch {
    return EXAMENES_DOCENTE_DEFAULT;
  }
}

/**
 * Búsqueda predictiva de estudiantes registrados por código SIS parcial o completo.
 * Retorna solo los estudiantes registrados que coinciden.
 */
export async function buscarEstudiantesPorCodSis(
  codSisQuery: string
): Promise<EstudianteRegistrado[]> {
  await delay(100);
  const q = codSisQuery.trim();
  if (!q) return [];
  return ESTUDIANTES_REGISTRADOS_DB.filter((est) =>
    est.codSis.includes(q)
  );
}

/**
 * Obtener nómina de colaboradores.
 * Cada docente ve solo su propia nómina. El administrador ve todo.
 */
export async function getColaboradores(params?: {
  docenteEmail?: string;
  isAdmin?: boolean;
}): Promise<Colaborador[]> {
  await delay(200);
  const list = getStoredColaboradores();
  if (params?.isAdmin) {
    return list;
  }
  // Cada docente ve solo su propia nómina
  const email = (params?.docenteEmail || DEFAULT_DOCENTE_EMAIL).toLowerCase();
  return list.filter((c) => c.docenteEmail?.toLowerCase() === email);
}

export async function getTodosAdmin(): Promise<Colaborador[]> {
  return getColaboradores({ isAdmin: true });
}

/**
 * Enviar solicitud de colaborador vinculada a un estudiante registrado por Código SIS.
 */
export async function solicitarColaborador(
  input: SolicitudColaboradorInput,
  userEmail: string,
  userNombre?: string
): Promise<Colaborador> {
  await delay(300);

  const cleanCodSis = input.codSis.trim();
  const currentEmail = (userEmail || "").trim().toLowerCase();

  // Validación 1: Verificar que pertenezca a un estudiante registrado
  const estudiante = ESTUDIANTES_REGISTRADOS_DB.find(
    (e) => e.codSis === cleanCodSis
  );
  if (!estudiante) {
    throw new Error("El código SIS no corresponde a un estudiante registrado.");
  }

  // Validación 2: No auto-solicitud (si coincide con el correo o usuario del docente)
  if (estudiante.email.toLowerCase() === currentEmail) {
    throw new Error("No puedes agregarte a ti mismo como colaborador.");
  }

  const list = getStoredColaboradores();

  // Validación 3: Solicitud duplicada de colaborador ya activo
  const yaActivo = list.some(
    (c) =>
      c.codSis === cleanCodSis &&
      c.docenteEmail?.toLowerCase() === currentEmail &&
      c.estado === "APROBADO"
  );
  if (yaActivo) {
    throw new Error("Este colaborador ya forma parte de tu equipo activo.");
  }

  const hoy = new Date();
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const nuevo: Colaborador = {
    id: Date.now(),
    codSis: estudiante.codSis,
    nombre: estudiante.nombre,
    apellido: estudiante.apellido,
    nombres: estudiante.nombre,
    apellidos: estudiante.apellido,
    nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
    email: estudiante.email,
    estado: "PENDIENTE",
    fechaSolicitud: fechaStr,
    examenesAsignadosIds: [],
    docenteEmail: currentEmail || DEFAULT_DOCENTE_EMAIL,
    docenteNombre: userNombre || "Luis Medina",
    aprobadoPor: "—",
    fechaRespuesta: "—",
  };

  const updated = [nuevo, ...list];
  saveStoredColaboradores(updated);
  return nuevo;
}

export async function darDeBajaColaborador(id: string | number): Promise<Colaborador> {
  await delay(250);
  const list = getStoredColaboradores();
  const index = list.findIndex((c) => String(c.id) === String(id));
  if (index === -1) {
    throw new Error("Colaborador no encontrado");
  }

  list[index].estado = "INACTIVO";
  saveStoredColaboradores(list);
  return list[index];
}

export async function aprobarSolicitud(
  id: string | number,
  adminNombre?: string
): Promise<Colaborador> {
  await delay(300);
  const list = getStoredColaboradores();
  const index = list.findIndex((c) => String(c.id) === String(id));
  if (index === -1) {
    throw new Error("Solicitud no encontrada");
  }

  const hoy = new Date();
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const col = list[index];
  col.estado = "APROBADO";
  col.rol = "Personal de control"; // Recibe el rol formalmente
  col.aprobadoPor = adminNombre || "Admin";
  col.fechaRespuesta = fechaStr;

  saveStoredColaboradores(list);
  return col;
}

export async function rechazarSolicitud(id: string | number): Promise<Colaborador> {
  await delay(300);
  const list = getStoredColaboradores();
  const index = list.findIndex((c) => String(c.id) === String(id));
  if (index === -1) {
    throw new Error("Solicitud no encontrada");
  }

  const hoy = new Date();
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const col = list[index];
  col.estado = "RECHAZADO";
  col.rol = undefined; // No recibe ningún rol
  col.fechaRespuesta = fechaStr;

  saveStoredColaboradores(list);
  return col;
}

export interface ExamenDisponibleItem extends ExamenItem {
  tieneChoque: boolean;
  motivoChoque?: string;
}

export async function getExamenesColaborador(
  colaboradorId: string | number
): Promise<{
  colaborador: Colaborador;
  asignados: ExamenItem[];
  disponibles: ExamenDisponibleItem[];
}> {
  await delay(200);
  const colaboradores = getStoredColaboradores();
  const col = colaboradores.find((c) => String(c.id) === String(colaboradorId));
  if (!col) throw new Error("Colaborador no encontrado");

  const todosExamenes = getStoredExamenes();
  const asignadosIds = new Set(
    (col.examenesAsignadosIds || []).map((id) => String(id))
  );

  const asignados = todosExamenes.filter((e) => asignadosIds.has(String(e.id)));
  const noAsignados = todosExamenes.filter((e) => !asignadosIds.has(String(e.id)));

  // Detectar choque de horario en exámenes disponibles
  const disponibles: ExamenDisponibleItem[] = noAsignados.map((disp) => {
    const colision = asignados.find(
      (asig) =>
        asig.fecha.trim().toLowerCase() === disp.fecha.trim().toLowerCase() &&
        asig.periodo.trim().toLowerCase() === disp.periodo.trim().toLowerCase()
    );

    return {
      ...disp,
      tieneChoque: !!colision,
      motivoChoque: colision
        ? `Coincide con ${colision.materia} (${colision.fecha} - ${colision.periodo})`
        : undefined,
    };
  });

  return {
    colaborador: col,
    asignados,
    disponibles,
  };
}

export async function asignarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  await delay(250);
  const colaboradores = getStoredColaboradores();
  const index = colaboradores.findIndex((c) => String(c.id) === String(colaboradorId));
  if (index === -1) throw new Error("Colaborador no encontrado");

  const col = colaboradores[index];
  if (col.estado !== "APROBADO") {
    throw new Error(
      "Solo se pueden asignar exámenes a colaboradores en estado Aprobado."
    );
  }

  const examenes = getStoredExamenes();
  const examenAAsignar = examenes.find((e) => String(e.id) === String(examenId));
  if (!examenAAsignar) throw new Error("Examen no encontrado");

  // Validar choque de horario (misma fecha y mismo período)
  const asignados = examenes.filter((e) =>
    (col.examenesAsignadosIds || []).some((id) => String(id) === String(e.id))
  );

  const tieneChoque = asignados.some(
    (asig) =>
      asig.fecha.trim().toLowerCase() === examenAAsignar.fecha.trim().toLowerCase() &&
      asig.periodo.trim().toLowerCase() === examenAAsignar.periodo.trim().toLowerCase()
  );

  if (tieneChoque) {
    throw new Error("No se puede asignar: el colaborador tiene choque de horario.");
  }

  if (!col.examenesAsignadosIds) {
    col.examenesAsignadosIds = [];
  }

  if (!col.examenesAsignadosIds.some((id) => String(id) === String(examenId))) {
    col.examenesAsignadosIds.push(examenId);
  }

  saveStoredColaboradores(colaboradores);
}

export async function quitarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  await delay(250);
  const colaboradores = getStoredColaboradores();
  const index = colaboradores.findIndex((c) => String(c.id) === String(colaboradorId));
  if (index === -1) throw new Error("Colaborador no encontrado");

  const col = colaboradores[index];
  const examenes = getStoredExamenes();
  const examen = examenes.find((e) => String(e.id) === String(examenId));

  // Regla: No permite retirar al colaborador si el examen ya inició o finalizó
  if (examen?.yaInicio) {
    throw new Error("El examen ya inició. No se puede retirar al colaborador.");
  }

  col.examenesAsignadosIds = (col.examenesAsignadosIds || []).filter(
    (id) => String(id) !== String(examenId)
  );

  saveStoredColaboradores(colaboradores);
}
