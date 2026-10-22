import { apiClient } from "../../../shared/lib/api-client";
import type {
  ExamenAsignado,
  ResumenEnVivoData,
  EstudianteBusquedaItem,
  RegistroManualPayload,
  RegistroManualResponse,
  ValidacionQrResponse,
} from "../types/control-ingreso.types";
import { offlineIngresosService } from "./offline-ingresos.service";

export const controlIngresoService = {
  /**
   * Obtiene la lista de exámenes asignados al usuario de control actual.
   */
  async getMisExamenes(): Promise<ExamenAsignado[]> {
    const response = await apiClient.get<ExamenAsignado[]>(
      "/control-ingreso/mis-examenes"
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene el resumen en vivo y los últimos ingresos de un examen activo.
   */
  async getResumenExamen(examenId: number): Promise<ResumenEnVivoData> {
    const response = await apiClient.get<ResumenEnVivoData>(
      `/control-ingreso/examenes/${examenId}/resumen`
    );
    return response.data;
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

    // 1. Intentar endpoint dedicado de control de ingreso: /ingresos/examen/:examenId/estudiantes
    try {
      const response = await apiClient.get<EstudianteBusquedaItem[]>(
        `/ingresos/examen/${examenId}/estudiantes?q=${encodeURIComponent(term)}`
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch {
      // Continuar con fallback
    }

    // 2. Fallback a endpoint general de examen: /examenes/:examenId/estudiantes
    try {
      const response = await apiClient.get<{
        total?: number;
        data?: Array<{
          estudiante_id: number;
          cod_sis: string;
          nombre: string;
          apellido?: string;
          ci?: string;
          estado_habilitado: boolean;
          motivo_inhabilitacion?: string | null;
        }>;
      }>(`/examenes/${examenId}/estudiantes?q=${encodeURIComponent(term)}&limit=50`);

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((item) => ({
          id: item.estudiante_id,
          codSis: item.cod_sis,
          ci: item.ci || "",
          nombre: item.nombre,
          apellido: item.apellido,
          estadoHabilitado: item.estado_habilitado,
          motivoInhabilitacion: item.motivo_inhabilitacion,
          ambienteAsignado: "",
          yaIngreso: false,
        }));
      }
    } catch {
      return [];
    }

    return [];
  },

  /**
   * HU8: Registra el ingreso manual de un estudiante validado en el examen activo.
   * Conectado con el contrato oficial de backend: POST /ingresos/manual
   */
  async registrarIngresoManual(
    examenId: number,
    payload: RegistroManualPayload
  ): Promise<RegistroManualResponse> {
    try {
      const response = await apiClient.post<{
        mensaje: string;
        ingreso: {
          id: number;
          estudianteId: number;
          examenId: number;
          fechaHora: string;
          metodo: string;
          esOffline: boolean;
          estudiante: {
            id: number;
            cod_sis: string;
            nombre: string;
            apellido: string;
            ci?: string;
          };
          examen?: {
            id: number;
            tipoExamen?: string;
          };
        };
      }>("/ingresos/manual", {
        examenId,
        identificador: payload.identificador,
        clienteSyncId: payload.clienteSyncId,
      });

      if (response.data && response.data.ingreso) {
        const ing = response.data.ingreso;
        return {
          success: true,
          ingresoId: ing.id,
          fechaHora: ing.fechaHora,
          estudiante: {
            id: ing.estudiante.id,
            codSis: ing.estudiante.cod_sis,
            ci: ing.estudiante.ci || "",
            nombre: ing.estudiante.nombre,
            apellido: ing.estudiante.apellido,
            estadoHabilitado: true,
            ambienteAsignado: "",
            yaIngreso: true,
          },
          mensaje: response.data.mensaje || "Ingreso registrado exitosamente",
        };
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status: number; data?: { message?: string } };
      };
      if (axiosErr.response?.data?.message) {
        throw new Error(axiosErr.response.data.message);
      }
      throw err;
    }

    throw new Error("No se pudo registrar el ingreso manual.");
  },

  /**
   * HU8: Validación inmediata de QR y registro automático de ingreso.
   * Valida estudiante existente, habilitado, ambiente correcto y no registrado previamente.
   */
  async validarYRegistrarQr(
    examenId: number,
    tokenQr: string,
    ambienteActual?: string
  ): Promise<ValidacionQrResponse> {
    const rawToken = tokenQr.trim();
    if (!rawToken) {
      return {
        success: false,
        excepcion: "QR_INVALIDO",
        mensaje: "El código QR leído está vacío o no es legible.",
      };
    }

    // 1. Manejo offline proactivo si el navegador no tiene red (Task-9.5)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const totalPendientes = await offlineIngresosService.guardarIngresoOffline(
        examenId,
        rawToken,
        undefined,
        "QR"
      );
      return {
        success: false,
        excepcion: "SIN_CONEXION",
        mensaje: "Ingreso guardado sin conexión",
        pendientesOffline: totalPendientes,
      };
    }

    // 2. Llamada al endpoint oficial del backend (HU9 Contract: POST /ingresos/qr)
    try {
      const syncId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : undefined;

      const response = await apiClient.post<{
        mensaje: string;
        ingreso: {
          id: number;
          estudianteId: number;
          examenId: number;
          fechaHora: string;
          metodo: string;
          esOffline: boolean;
          estudiante: {
            id: number;
            cod_sis: string;
            nombre: string;
            apellido: string;
            ci?: string;
          };
          examen?: {
            id: number;
            tipoExamen?: string;
          };
        };
      }>("/ingresos/qr", {
        examenId,
        token: rawToken,
        clienteSyncId: syncId,
      });

      if (response.data && response.data.ingreso) {
        const ing = response.data.ingreso;
        const horaFormateada = new Date(ing.fechaHora).toLocaleTimeString(
          "es-BO",
          { hour: "2-digit", minute: "2-digit", second: "2-digit" }
        );

        return {
          success: true,
          ingresoId: ing.id,
          fechaHora: ing.fechaHora,
          estudiante: {
            id: ing.estudiante.id,
            nombre: ing.estudiante.nombre,
            apellido: ing.estudiante.apellido,
            codSis: ing.estudiante.cod_sis,
            carrera: "Ingeniería de Sistemas",
            horaIngreso: horaFormateada,
          },
        };
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status: number; data?: { message?: string } };
        code?: string;
      };

      if (!axiosErr.response || axiosErr.code === "ERR_NETWORK") {
        const totalPendientes = await offlineIngresosService.guardarIngresoOffline(
          examenId,
          rawToken,
          undefined,
          "QR"
        );
        return {
          success: false,
          excepcion: "SIN_CONEXION",
          mensaje: "Ingreso guardado sin conexión",
          pendientesOffline: totalPendientes,
        };
      }

      const status = axiosErr.response.status;
      const message = axiosErr.response.data?.message || "";

      // 409 Conflict: Doble marcación ("El estudiante ya registró su ingreso a este examen")
      if (status === 409) {
        return {
          success: false,
          excepcion: "YA_REGISTRADO",
          mensaje: message || "El estudiante ya registró su ingreso a este examen",
          horaIngresoPrevio: "Previa marcación",
        };
      }

      // 400 Bad Request: Varias razones de negocio
      if (status === 400) {
        if (message.includes("expirado")) {
          return {
            success: false,
            excepcion: "QR_INVALIDO",
            mensaje: message,
          };
        }
        if (message.includes("no figura en la nómina")) {
          return {
            success: false,
            excepcion: "AMBIENTE_INCORRECTO",
            mensaje: message,
            ambienteAsignado: ambienteActual
              ? `Diferente a ${ambienteActual}`
              : "Otro ambiente asignado",
          };
        }
        if (message.includes("no habilitado")) {
          const motivo = message.replace(/^Estudiante no habilitado:\s*/i, "");
          return {
            success: false,
            excepcion: "NO_HABILITADO",
            motivoInhabilitacion: motivo || "Estudiante no habilitado",
            mensaje: message,
          };
        }
      }

      // 404 Not Found: Código QR inexistente ("Código QR no válido o inexistente")
      if (status === 404) {
        return {
          success: false,
          excepcion: "QR_INVALIDO",
          mensaje: message || "Código QR no válido o inexistente",
        };
      }

      return {
        success: false,
        excepcion: "QR_INVALIDO",
        mensaje: message || "Error al validar el código QR",
      };
    }

    return {
      success: false,
      excepcion: "QR_INVALIDO",
      mensaje: "No se pudo validar el código QR",
    };
  },
};
