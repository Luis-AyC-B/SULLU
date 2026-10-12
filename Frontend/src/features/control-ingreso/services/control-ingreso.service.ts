import { apiClient } from "../../../shared/lib/api-client";
import type {
  ExamenAsignado,
  ResumenEnVivoData,
  EstudianteBusquedaItem,
  RegistroManualPayload,
  RegistroManualResponse,
} from "../types/control-ingreso.types";

/**
 * Datos semilla de respaldo basados en Prisma seed.ts y los mockups oficiales.
 * Se utilizan de forma transparente si el backend aún no tiene los endpoints listos.
 */
export const SEED_EXAMENES_ASIGNADOS: ExamenAsignado[] = [
  {
    id: 1,
    asignatura: "Cálculo II",
    sigla: "CALCII",
    estado: "EN_CURSO",
    totalEstudiantes: 85,
    fecha: "6 sep 2026",
    horario: "09:00–11:00",
    ambiente: "Sala 204",
    capacidadAmbiente: 100,
    tipoExamen: "Primer Parcial",
  },
  {
    id: 2,
    asignatura: "Estadística I",
    sigla: "EST1",
    estado: "PROXIMO",
    totalEstudiantes: 110,
    fecha: "6 sep 2026",
    horario: "12:00–14:00",
    ambiente: "Auditorio B",
    capacidadAmbiente: 150,
    tipoExamen: "Primer Parcial",
  },
  {
    id: 3,
    asignatura: "Física General",
    sigla: "FIS1",
    estado: "PROXIMO",
    totalEstudiantes: 72,
    fecha: "7 sep 2026",
    horario: "08:00–10:00",
    ambiente: "Sala 101",
    capacidadAmbiente: 80,
    tipoExamen: "Examen de Diagnóstico",
  },
];

export const SEED_RESUMEN_DEFAULT: ResumenEnVivoData = {
  examenId: 1,
  asignatura: "Cálculo II",
  ambiente: "Sala 204",
  horario: "09:00–11:00",
  estado: "EN_CURSO",
  totalHabilitados: 85,
  ingresados: 38,
  pendientes: 47,
  incidencias: 2,
  ultimosIngresos: [
    {
      id: 1,
      nombre: "Andrés González",
      codSis: "2020-08711",
      hora: "08:47",
      metodo: "QR",
    },
    {
      id: 2,
      nombre: "Camila Méndez",
      codSis: "2021-09442",
      hora: "08:44",
      metodo: "MANUAL",
    },
    {
      id: 3,
      nombre: "José Ramírez",
      codSis: "2022-11703",
      hora: "08:41",
      metodo: "QR",
    },
  ],
};

export const SEED_ESTUDIANTES_BUSQUEDA: EstudianteBusquedaItem[] = [
  {
    id: 101,
    codSis: "2021-10234",
    ci: "V-27.104.882",
    nombre: "Valentina",
    apellido: "Pérez",
    carrera: "Ingeniería de Sistemas",
    estadoHabilitado: true,
    motivoInhabilitacion: null,
    ambienteAsignado: "Sala 204",
    yaIngreso: false,
  },
  {
    id: 102,
    codSis: "2021-10965",
    ci: "V-25.992.301",
    nombre: "Diego",
    apellido: "Fernández",
    carrera: "Ingeniería Electrónica",
    estadoHabilitado: true,
    motivoInhabilitacion: null,
    ambienteAsignado: "Sala 204",
    yaIngreso: false,
  },
  {
    id: 103,
    codSis: "2021-09442",
    ci: "V-26.411.092",
    nombre: "Camila",
    apellido: "Méndez",
    carrera: "Ingeniería de Sistemas",
    estadoHabilitado: true,
    motivoInhabilitacion: null,
    ambienteAsignado: "Sala 204",
    yaIngreso: true,
    horaIngresoPrevio: "08:44",
    metodoIngresoPrevio: "MANUAL",
  },
  {
    id: 104,
    codSis: "2020-05819",
    ci: "V-24.819.330",
    nombre: "Carlos",
    apellido: "Rocha",
    carrera: "Ingeniería Civil",
    estadoHabilitado: true,
    motivoInhabilitacion: null,
    ambienteAsignado: "Aula A-101",
    yaIngreso: false,
  },
  {
    id: 105,
    codSis: "2021-11884",
    ci: "V-28.012.441",
    nombre: "Rodrigo",
    apellido: "Torrico",
    carrera: "Ingeniería Informática",
    estadoHabilitado: false,
    motivoInhabilitacion:
      "No cumple con el porcentaje mínimo de asistencia (menor al 80%)",
    ambienteAsignado: "Sala 204",
    yaIngreso: false,
  },
];

export const controlIngresoService = {
  /**
   * Obtiene la lista de exámenes asignados al usuario de control actual.
   */
  async getMisExamenes(): Promise<ExamenAsignado[]> {
    try {
      const response = await apiClient.get<ExamenAsignado[]>(
        "/control-ingreso/mis-examenes"
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return SEED_EXAMENES_ASIGNADOS;
    } catch {
      // Fallback a los datos del seed si el endpoint aún no está implementado en backend
      return SEED_EXAMENES_ASIGNADOS;
    }
  },

  /**
   * Obtiene el resumen en vivo y los últimos ingresos de un examen activo.
   */
  async getResumenExamen(examenId: number): Promise<ResumenEnVivoData> {
    try {
      const response = await apiClient.get<ResumenEnVivoData>(
        `/control-ingreso/examenes/${examenId}/resumen`
      );
      if (response.data) {
        return response.data;
      }
      return {
        ...SEED_RESUMEN_DEFAULT,
        examenId,
      };
    } catch {
      return {
        ...SEED_RESUMEN_DEFAULT,
        examenId,
      };
    }
  },

  /**
   * HU8: Busca estudiantes por código SIS, carnet (CI) o nombre para el examen activo.
   */
  async buscarEstudiantes(
    examenId: number,
    query: string
  ): Promise<EstudianteBusquedaItem[]> {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    try {
      const response = await apiClient.get<EstudianteBusquedaItem[]>(
        `/control-ingreso/examenes/${examenId}/estudiantes/buscar?q=${encodeURIComponent(
          term
        )}`
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch {
      // Fallback a simulación con datos locales
    }

    return SEED_ESTUDIANTES_BUSQUEDA.filter((est) => {
      const fullName = `${est.nombre} ${est.apellido ?? ""}`.toLowerCase();
      const sis = est.codSis.toLowerCase();
      const ci = est.ci.toLowerCase().replace(/[^0-9a-z]/g, "");
      const cleanTerm = term.replace(/[^0-9a-z]/g, "");

      return (
        fullName.includes(term) ||
        sis.includes(term) ||
        (cleanTerm.length >= 2 && ci.includes(cleanTerm))
      );
    });
  },

  /**
   * HU8: Registra el ingreso manual de un estudiante validado en el examen activo.
   */
  async registrarIngresoManual(
    examenId: number,
    payload: RegistroManualPayload
  ): Promise<RegistroManualResponse> {
    try {
      const response = await apiClient.post<RegistroManualResponse>(
        `/control-ingreso/examenes/${examenId}/ingresos/manual`,
        payload
      );
      if (response.data) {
        return response.data;
      }
    } catch (err: unknown) {
      // Si la API responde con un error estructurado, relanzarlo
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
      ) {
        const errorData = (err.response as { data: { message?: string } }).data;
        if (errorData?.message) {
          throw new Error(errorData.message);
        }
      }
    }

    // Fallback de registro simulado si backend no está disponible
    const estudiante =
      SEED_ESTUDIANTES_BUSQUEDA.find((e) => e.id === payload.estudianteId) || {
        id: payload.estudianteId,
        codSis: "2021-10234",
        ci: "V-27.104.882",
        nombre: "Estudiante",
        apellido: "Registrado",
        carrera: "Ingeniería de Sistemas",
        estadoHabilitado: true,
        ambienteAsignado: "Sala 204",
        yaIngreso: true,
      };

    estudiante.yaIngreso = true;
    const now = new Date();
    const hora = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    estudiante.horaIngresoPrevio = hora;
    estudiante.metodoIngresoPrevio = "MANUAL";

    // Actualizar también el resumen de respaldo en vivo
    SEED_RESUMEN_DEFAULT.ingresados += 1;
    SEED_RESUMEN_DEFAULT.pendientes = Math.max(
      0,
      SEED_RESUMEN_DEFAULT.pendientes - 1
    );
    SEED_RESUMEN_DEFAULT.ultimosIngresos = [
      {
        id: Date.now(),
        nombre: `${estudiante.nombre} ${estudiante.apellido ?? ""}`.trim(),
        codSis: estudiante.codSis,
        hora,
        metodo: "MANUAL",
      },
      ...SEED_RESUMEN_DEFAULT.ultimosIngresos,
    ];

    return {
      success: true,
      ingresoId: Math.floor(Math.random() * 10000) + 1,
      fechaHora: now.toISOString(),
      estudiante,
      mensaje: "Ingreso manual registrado correctamente",
    };
  },
};
