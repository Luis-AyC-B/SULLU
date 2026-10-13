import { Colaborador, ExamenItem, SolicitudColaboradorInput } from "../schemas/colaborador.schema";

const STORAGE_KEY_COLABORADORES = "exacontrol_colaboradores_v2";
const STORAGE_KEY_EXAMENES = "exacontrol_examenes_colaboradores_v2";

const DEFAULT_DOCENTE_EMAIL = "docente@umss.edu";

// Colaboradores iniciales según mockups oficiales de Figma (Registro de Administrador y Docente)
const COLABORADORES_DEFAULT: Colaborador[] = [
  {
    id: 1,
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
    usuarioExiste: true,
    rol: "Personal de control",
  },
  {
    id: 2,
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
    usuarioExiste: false, // "Usuario nuevo: se creará la cuenta"
    rol: "Personal de control",
  },
  {
    id: 3,
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
    usuarioExiste: true, // "Usuario existente: se vinculará al docente"
    rol: "Personal de control",
  },
  {
    id: 4,
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
    usuarioExiste: false, // "Usuario nuevo: se creará la cuenta"
    rol: "Personal de control",
  },
  {
    id: 5,
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
    usuarioExiste: true,
    rol: "Personal de control",
  },
  {
    id: 6,
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
    usuarioExiste: true,
    rol: "Personal de control",
  },
  {
    id: 7,
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
    usuarioExiste: true,
    rol: "Personal de control",
  },
];

// Pool de exámenes del docente según mockup oficial
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

export async function getColaboradores(params?: {
  docenteEmail?: string;
  isAdmin?: boolean;
}): Promise<Colaborador[]> {
  await delay(200);
  const list = getStoredColaboradores();
  if (params?.isAdmin) {
    return list;
  }
  // Para docente, muestra su nómina vinculada a él
  return list;
}

export async function solicitarColaborador(
  input: SolicitudColaboradorInput,
  userEmail: string,
  userNombre?: string
): Promise<Colaborador> {
  await delay(300);

  const cleanEmail = input.email.trim().toLowerCase();
  const currentEmail = (userEmail || "").trim().toLowerCase();

  // Regla: No puedes agregarte a ti mismo como colaborador
  if (cleanEmail === currentEmail) {
    throw new Error("No puedes agregarte a ti mismo como colaborador.");
  }

  const list = getStoredColaboradores();

  // Regla: No permitir si ya figura como APROBADO en la nómina activa
  const yaActivo = list.some(
    (c) =>
      c.email.trim().toLowerCase() === cleanEmail &&
      c.estado === "APROBADO"
  );
  if (yaActivo) {
    throw new Error("Este colaborador ya forma parte de tu equipo activo.");
  }

  const existePrevio = list.some(
    (c) => c.email.trim().toLowerCase() === cleanEmail
  );

  const hoy = new Date();
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const nuevo: Colaborador = {
    id: Date.now(),
    nombres: input.nombres.trim(),
    apellidos: input.apellidos.trim(),
    nombreCompleto: `${input.nombres.trim()} ${input.apellidos.trim()}`,
    email: cleanEmail,
    estado: "PENDIENTE",
    fechaSolicitud: fechaStr,
    examenesAsignadosIds: [],
    docenteEmail: currentEmail || DEFAULT_DOCENTE_EMAIL,
    docenteNombre: userNombre || "Luis Medina",
    aprobadoPor: "—",
    fechaRespuesta: "—",
    usuarioExiste: existePrevio,
    rol: "Personal de control",
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

export async function aprobarSolicitud(id: string | number): Promise<Colaborador> {
  await delay(300);
  const list = getStoredColaboradores();
  const index = list.findIndex((c) => String(c.id) === String(id));
  if (index === -1) {
    throw new Error("Solicitud no encontrada");
  }

  const hoy = new Date();
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const col = list[index];
  col.estado = "APROBADO";
  col.aprobadoPor = "Admin";
  col.fechaRespuesta = fechaStr;

  if (!col.usuarioExiste) {
    col.usuarioExiste = true;
  }

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
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const col = list[index];
  col.estado = "RECHAZADO";
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
  const asignadosIds = new Set(col.examenesAsignadosIds.map((id) => String(id)));

  const asignados = todosExamenes.filter((e) => asignadosIds.has(String(e.id)));
  const noAsignados = todosExamenes.filter((e) => !asignadosIds.has(String(e.id)));

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
    throw new Error("Solo se pueden asignar exámenes a colaboradores aprobados.");
  }

  const examenes = getStoredExamenes();
  const examenAAsignar = examenes.find((e) => String(e.id) === String(examenId));
  if (!examenAAsignar) throw new Error("Examen no encontrado");

  const asignados = examenes.filter((e) =>
    col.examenesAsignadosIds.some((id) => String(id) === String(e.id))
  );

  const tieneChoque = asignados.some(
    (asig) =>
      asig.fecha.trim().toLowerCase() === examenAAsignar.fecha.trim().toLowerCase() &&
      asig.periodo.trim().toLowerCase() === examenAAsignar.periodo.trim().toLowerCase()
  );

  if (tieneChoque) {
    throw new Error("No se puede asignar: el colaborador tiene choque de horario.");
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

  if (examen?.yaInicio) {
    throw new Error("El examen ya inició. No se puede retirar al colaborador.");
  }

  col.examenesAsignadosIds = col.examenesAsignadosIds.filter(
    (id) => String(id) !== String(examenId)
  );

  saveStoredColaboradores(colaboradores);
}
