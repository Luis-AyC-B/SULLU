export type EstadoExamenAsignado = "EN_CURSO" | "PROXIMO" | "FINALIZADO";

export interface ExamenAsignado {
  id: number;
  asignatura: string;
  sigla?: string;
  estado: EstadoExamenAsignado;
  totalEstudiantes: number;
  fecha: string; // ej: "6 sep 2026"
  horario: string; // ej: "09:00–11:00"
  ambiente: string; // ej: "Sala 204"
  capacidadAmbiente?: number;
  tipoExamen?: string;
}

export interface UltimoIngresoItem {
  id: number;
  nombre: string;
  codSis: string;
  hora: string;
  metodo: "QR" | "MANUAL";
}

export interface ResumenEnVivoData {
  examenId: number;
  asignatura: string;
  ambiente: string;
  horario: string;
  estado: EstadoExamenAsignado;
  totalHabilitados: number;
  ingresados: number;
  pendientes: number;
  incidencias: number;
  ultimosIngresos: UltimoIngresoItem[];
}

export type EstadoConexion = "SINCRONIZADO" | "EN_LINEA" | "OFFLINE";

export interface DeviceCapabilities {
  canScanQr: boolean;
  isMobile: boolean;
  hasCamera: boolean;
  helperText?: string;
}
