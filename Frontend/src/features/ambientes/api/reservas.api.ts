import { Reserva, CrearReservaInput } from "../schemas/reserva.schema";

// Clave para guardar en el navegador las reservas del usuario durante pruebas
const STORAGE_KEY = "exacontrol_mis_reservas_dev";

// Reservas iniciales oficiales del mockup (HU15)
const RESERVAS_INICIALES: Reserva[] = [
  {
    id: 1,
    ambienteId: 21,
    ambienteNombre: "Sala 204",
    facultad: "FCyT",
    fecha: "2026-10-15",
    periodoNombre: "Periodo 2",
    horaIni: "08:15",
    horaFin: "09:45",
    estado: "RESERVADO",
    examenAsociado: null,
    tieneExamenAsignado: false,
  },
  {
    id: 2,
    ambienteId: 1,
    ambienteNombre: "Laboratorio Informática 1",
    facultad: "FCyT",
    fecha: "2026-10-16",
    periodoNombre: "Periodo 3",
    horaIni: "09:45",
    horaFin: "11:15",
    estado: "RESERVADO",
    examenAsociado: "Redes de Computadoras – Primer parcial",
    tieneExamenAsignado: true,
  },
  {
    id: 3,
    ambienteId: 3,
    ambienteNombre: "Aula A-101",
    facultad: "FCE",
    fecha: "2026-10-19",
    periodoNombre: "Periodo 1",
    horaIni: "06:45",
    horaFin: "08:15",
    estado: "RESERVADO",
    examenAsociado: null,
    tieneExamenAsignado: false,
  },
];

function getStoredReservas(): Reserva[] {
  if (typeof window === "undefined") return RESERVAS_INICIALES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(RESERVAS_INICIALES));
      return RESERVAS_INICIALES;
    }
    return JSON.parse(raw);
  } catch {
    return RESERVAS_INICIALES;
  }
}

function saveStoredReservas(reservas: Reserva[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
  } catch (e) {
    console.error("Error guardando reservas:", e);
  }
}

export const reservasApi = {
  getMisReservas: async (): Promise<Reserva[]> => {
    // Simular latencia de red
    await new Promise((resolve) => setTimeout(resolve, 200));
    return getStoredReservas();
  },

  crearReserva: async (input: CrearReservaInput): Promise<Reserva> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reservas = getStoredReservas();

    const nuevaReserva: Reserva = {
      id: Date.now(),
      ambienteId: input.ambienteId,
      ambienteNombre: input.ambienteNombre || `Ambiente #${input.ambienteId}`,
      facultad: "FCyT",
      fecha: input.fecha,
      periodoNombre: input.periodoNombre || `Periodo ${input.horarioFijoId}`,
      horaIni: "08:15",
      horaFin: "09:45",
      estado: "RESERVADO",
      examenAsociado: null,
      tieneExamenAsignado: false,
    };

    const actualizada = [nuevaReserva, ...reservas];
    saveStoredReservas(actualizada);
    return nuevaReserva;
  },

  cancelarReserva: async (reservaId: string | number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reservas = getStoredReservas();
    const filtrada = reservas.filter((r) => String(r.id) !== String(reservaId));
    saveStoredReservas(filtrada);
  },
};
