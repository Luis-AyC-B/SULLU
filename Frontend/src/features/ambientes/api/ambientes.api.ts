import { Ambiente, PeriodoDisponibilidad, EstadoAmbiente } from "../schemas/ambiente.schema";

export interface GetAmbientesParams {
  facultadId?: string | number;
  tipoAulaId?: string | number;
  estado?: string;
  search?: string;
}

const STORAGE_KEY_AMBIENTES = "exacontrol_ambientes_dev";

// 20 Ambientes reales según el schema de Prisma y el seed de la UMSS
const AMBIENTES_DATABASE_DEFAULT: Ambiente[] = [
  // FCyT (facultadId: 1)
  { id: 1, nombre: "Laboratorio Informática 1 (FCyT)", capacidad: 40, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },
  { id: 2, nombre: "Laboratorio Informática 2 (FCyT)", capacidad: 40, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },
  { id: 3, nombre: "Aula A-101 (FCyT)", capacidad: 60, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 4, nombre: "Aula A-102 (FCyT)", capacidad: 60, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 5, nombre: "Aula B-201 (FCyT)", capacidad: 80, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 6, nombre: "Aula B-202 (FCyT)", capacidad: 80, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 7, nombre: "Auditorio FCyT", capacidad: 200, facultadId: 1, facultad: "Facultad de Ciencias y Tecnología (FCyT)", tipoAulaId: 3, tipoAula: "Auditorio", estado: "HABILITADO" },
  { id: 21, nombre: "Sala 204", capacidad: 40, facultadId: 1, facultad: "FCyT", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 22, nombre: "Sala 205", capacidad: 35, facultadId: 1, facultad: "FCyT", tipoAulaId: 1, tipoAula: "Aula común", estado: "EN_REMODELACION" },

  // FCE (facultadId: 2)
  { id: 8, nombre: "Aula 101 (FCE)", capacidad: 70, facultadId: 2, facultad: "Facultad de Ciencias Económicas (FCE)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 9, nombre: "Aula 102 (FCE)", capacidad: 70, facultadId: 2, facultad: "Facultad de Ciencias Económicas (FCE)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 10, nombre: "Sala de Cómputo FCE", capacidad: 35, facultadId: 2, facultad: "Facultad de Ciencias Económicas (FCE)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },
  { id: 11, nombre: "Auditorio FCE", capacidad: 180, facultadId: 2, facultad: "Facultad de Ciencias Económicas (FCE)", tipoAulaId: 3, tipoAula: "Auditorio", estado: "HABILITADO" },

  // FHCE (facultadId: 3)
  { id: 12, nombre: "Aula 201 (FHCE)", capacidad: 50, facultadId: 3, facultad: "Facultad de Humanidades y Ciencias de la Educación (FHCE)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 13, nombre: "Aula 202 (FHCE)", capacidad: 50, facultadId: 3, facultad: "Facultad de Humanidades y Ciencias de la Educación (FHCE)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 14, nombre: "Laboratorio de Psicología (FHCE)", capacidad: 25, facultadId: 3, facultad: "Facultad de Humanidades y Ciencias de la Educación (FHCE)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },

  // FCJP (facultadId: 4)
  { id: 15, nombre: "Aula 301 (FCJP)", capacidad: 90, facultadId: 4, facultad: "Facultad de Ciencias Jurídicas y Políticas (FCJP)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 16, nombre: "Aula 302 (FCJP)", capacidad: 90, facultadId: 4, facultad: "Facultad de Ciencias Jurídicas y Políticas (FCJP)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
  { id: 17, nombre: "Sala de Simulación Jurídica (FCJP)", capacidad: 40, facultadId: 4, facultad: "Facultad de Ciencias Jurídicas y Políticas (FCJP)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },

  // FM (facultadId: 5)
  { id: 18, nombre: "Aula Magna FM", capacidad: 300, facultadId: 5, facultad: "Facultad de Medicina (FM)", tipoAulaId: 3, tipoAula: "Auditorio", estado: "HABILITADO" },
  { id: 19, nombre: "Laboratorio Anatomía FM", capacidad: 30, facultadId: 5, facultad: "Facultad de Medicina (FM)", tipoAulaId: 2, tipoAula: "Laboratorio", estado: "HABILITADO" },
  { id: 20, nombre: "Aula A FM", capacidad: 100, facultadId: 5, facultad: "Facultad de Medicina (FM)", tipoAulaId: 1, tipoAula: "Aula común", estado: "HABILITADO" },
];

function getStoredAmbientes(): Ambiente[] {
  if (typeof window === "undefined") return AMBIENTES_DATABASE_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AMBIENTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AMBIENTES, JSON.stringify(AMBIENTES_DATABASE_DEFAULT));
      return AMBIENTES_DATABASE_DEFAULT;
    }
    return JSON.parse(raw);
  } catch {
    return AMBIENTES_DATABASE_DEFAULT;
  }
}

function saveStoredAmbientes(ambientes: Ambiente[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_AMBIENTES, JSON.stringify(ambientes));
  } catch (e) {
    console.error("Error guardando ambientes:", e);
  }
}

const PERIODOS_BASE = [
  { id: 1, periodoNombre: "Periodo 1", horaIni: "06:45", horaFin: "08:15" },
  { id: 2, periodoNombre: "Periodo 2", horaIni: "08:15", horaFin: "09:45" },
  { id: 3, periodoNombre: "Periodo 3", horaIni: "09:45", horaFin: "11:15" },
  { id: 4, periodoNombre: "Periodo 4", horaIni: "11:15", horaFin: "12:45" },
  { id: 5, periodoNombre: "Periodo 5", horaIni: "12:45", horaFin: "14:15" },
  { id: 6, periodoNombre: "Periodo 6", horaIni: "14:15", horaFin: "15:45" },
];

export const ambientesApi = {
  getAmbientes: async (params?: GetAmbientesParams): Promise<Ambiente[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    let resultado = getStoredAmbientes();

    if (params?.search) {
      const q = params.search.toLowerCase();
      resultado = resultado.filter((a) => a.nombre.toLowerCase().includes(q));
    }

    if (params?.facultadId) {
      resultado = resultado.filter((a) => String(a.facultadId) === String(params.facultadId));
    }

    return resultado;
  },

  updateEstadoAmbiente: async (
    ambienteId: string | number,
    nuevoEstado: EstadoAmbiente
  ): Promise<Ambiente> => {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const lista = getStoredAmbientes();
    const index = lista.findIndex((a) => String(a.id) === String(ambienteId));

    if (index === -1) {
      throw new Error("Ambiente no encontrado");
    }

    lista[index] = {
      ...lista[index],
      estado: nuevoEstado,
    };

    saveStoredAmbientes(lista);
    return lista[index];
  },

  getDisponibilidad: async (ambienteId: string | number, fecha: string): Promise<PeriodoDisponibilidad[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return PERIODOS_BASE.map((p) => {
      const isReservado = (Number(ambienteId) + p.id + fecha.length) % 3 === 0;

      return {
        id: p.id,
        periodoNombre: p.periodoNombre,
        horaIni: p.horaIni,
        horaFin: p.horaFin,
        estado: isReservado ? "RESERVADO" : "LIBRE",
      };
    });
  },
};
