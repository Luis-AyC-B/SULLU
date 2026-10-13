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

export type TipoExcepcionIngreso =
  | "YA_REGISTRADO"
  | "NO_HABILITADO"
  | "AMBIENTE_INCORRECTO";

export interface EstudianteBusquedaItem {
  id: number;
  codSis: string;
  ci: string;
  nombre: string;
  apellido?: string;
  estadoHabilitado: boolean;
  motivoInhabilitacion?: string | null;
  ambienteAsignado: string;
  yaIngreso: boolean;
  horaIngresoPrevio?: string;
  metodoIngresoPrevio?: "QR" | "MANUAL";
}

export interface RegistroManualPayload {
  estudianteId: number;
  clienteSyncId?: string;
}

export interface RegistroManualResponse {
  success: boolean;
  ingresoId: number;
  fechaHora: string;
  estudiante: EstudianteBusquedaItem;
  mensaje?: string;
}

// ==========================================
// HU8: TIPOS PARA ESCÁNER QR Y EXCEPCIONES
// ==========================================

export type TipoExcepcionQr =
  | "YA_REGISTRADO"
  | "NO_HABILITADO"
  | "AMBIENTE_INCORRECTO"
  | "QR_INVALIDO"
  | "SIN_CONEXION"
  | "CAMARA_DENEGADA";

export interface EstudianteQrResultado {
  id?: number;
  nombre: string;
  apellido?: string;
  codSis: string;
  carrera?: string;
  horaIngreso?: string;
  horaIngresoPrevio?: string;
  motivoInhabilitacion?: string;
  ambienteAsignado?: string;
}

export interface ValidacionQrResponse {
  success: boolean;
  ingresoId?: number;
  fechaHora?: string;
  estudiante?: EstudianteQrResultado;
  excepcion?: TipoExcepcionQr;
  mensaje?: string;
  horaIngresoPrevio?: string;
  motivoInhabilitacion?: string;
  ambienteAsignado?: string;
  pendientesOffline?: number;
}

export interface IngresoOfflineItem {
  id: string; // UUID o ID único
  examenId: number;
  tokenQr: string;
  codSis?: string;
  nombreReferencial?: string;
  fechaHoraCaptura: string;
  sincronizado: boolean;
}
