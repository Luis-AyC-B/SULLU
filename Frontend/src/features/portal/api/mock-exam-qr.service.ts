import {
  CODIGOS_ERROR_QR_EXAMEN,
  ExamQrError,
  type Examen,
  type RespuestaExamenes,
  type RespuestaGenerarQrExamen,
  type ResultadoValidacionQr,
} from '../types/qr-examen';

export type EscenarioMock =
  | 'TODOS_LOS_ESTADOS'
  | 'LISTA_VACIA'
  | 'ERROR_RED'
  | 'VERIFICACION_EXITOSA'
  | 'VERIFICACION_FALLIDA_1'
  | 'VERIFICACION_FALLIDA_2'
  | 'INTENTOS_AGOTADOS'
  | 'SIN_ROSTRO'
  | 'VERIFICACION_FOTO_DESACTIVADA'
  | 'QR_VENCE_EN_VIVO';

// Estado global en memoria para pruebas de desarrollo
let escenarioActual: EscenarioMock = 'TODOS_LOS_ESTADOS';
const listeners = new Set<(escenario: EscenarioMock) => void>();

export function setEscenarioMock(nuevo: EscenarioMock): void {
  escenarioActual = nuevo;
  listeners.forEach((fn) => fn(nuevo));
}

export function getEscenarioMock(): EscenarioMock {
  return escenarioActual;
}

export function suscribirEscenarioMock(fn: (escenario: EscenarioMock) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function generarFechasRelativas() {
  const ahora = new Date();

  const iso = (d: Date) => d.toISOString();
  const masHoras = (h: number) => new Date(ahora.getTime() + h * 60 * 60 * 1000);
  const menosHoras = (h: number) => new Date(ahora.getTime() - h * 60 * 60 * 1000);

  return {
    // 1. NO DISPONIBLE AUN: Examen en 30 horas. QR disponible desde en 6 horas (24h antes del inicio).
    noDisponible: {
      inicio: iso(masHoras(30)),
      fin: iso(masHoras(32)),
      disponibleDesde: iso(masHoras(6)),
    },
    // 2. DISPONIBLE: Examen en 1 hora. Termina en 3 horas. QR ya disponible desde ayer.
    disponible: {
      inicio: iso(masHoras(1)),
      fin: iso(masHoras(3)),
      disponibleDesde: iso(menosHoras(23)),
    },
    // 3. GENERADO: Examen en 30 minutos. Termina en 2.5 horas.
    generado: {
      inicio: iso(masHoras(0.5)),
      fin: iso(masHoras(2.5)),
      disponibleDesde: iso(menosHoras(20)),
    },
    // 4. FINALIZADO: Examen terminó hace 2 horas.
    finalizado: {
      inicio: iso(menosHoras(4)),
      fin: iso(menosHoras(2)),
      disponibleDesde: iso(menosHoras(28)),
    },
    // 5. INHABILITADO: Examen mañana.
    inhabilitado: {
      inicio: iso(masHoras(24)),
      fin: iso(masHoras(26)),
      disponibleDesde: iso(ahora),
    },
  };
}

export class MockExamQrService {
  async getExamenes(): Promise<RespuestaExamenes> {
    await new Promise((r) => setTimeout(r, 200));

    if (escenarioActual === 'ERROR_RED') {
      throw new ExamQrError({ codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED });
    }

    if (escenarioActual === 'LISTA_VACIA') {
      return { verificacionFotoActiva: true, examenes: [] };
    }

    const f = generarFechasRelativas();
    const verificacionFotoActiva = escenarioActual !== 'VERIFICACION_FOTO_DESACTIVADA';

    const examenes: Examen[] = [
      {
        id: 101,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Cálculo II – Segundo Parcial',
        ambiente: 'Aula 691, Edificio MEMI',
        fechaInicio: f.noDisponible.inicio,
        fechaFin: f.noDisponible.fin,
        habilitado: true,
        estadoQr: 'NO_DISPONIBLE_AUN',
        qrDisponibleDesde: f.noDisponible.disponibleDesde,
        qrVigenteHasta: f.noDisponible.fin,
        qrGenerado: false,
      },
      {
        id: 102,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Base de Datos I – Examen Final',
        ambiente: 'Laboratorio 3, Edificio TIC',
        fechaInicio: f.disponible.inicio,
        fechaFin: f.disponible.fin,
        habilitado: true,
        estadoQr: 'DISPONIBLE',
        qrDisponibleDesde: f.disponible.disponibleDesde,
        qrVigenteHasta: f.disponible.fin,
        qrGenerado: false,
      },
      {
        id: 103,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Redes de Computadoras – Final',
        ambiente: 'Laboratorio de Informática 2 (FCyT)',
        fechaInicio: f.generado.inicio,
        fechaFin: f.generado.fin,
        habilitado: true,
        estadoQr: 'GENERADO',
        qrDisponibleDesde: f.generado.disponibleDesde,
        qrVigenteHasta: f.generado.fin,
        qrGenerado: true,
        qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/mock-token-redes-103',
        token: 'mock-token-redes-103',
      },
      {
        id: 104,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Programación Web – Examen Final',
        ambiente: 'Aula 624',
        fechaInicio: f.finalizado.inicio,
        fechaFin: f.finalizado.fin,
        habilitado: true,
        estadoQr: 'FINALIZADO',
        qrDisponibleDesde: f.finalizado.disponibleDesde,
        qrVigenteHasta: f.finalizado.fin,
        qrGenerado: false,
      },
      {
        id: 105,
        carrera: 'Ingeniería de Sistemas',
        nombre: 'Inteligencia Artificial – Examen Final',
        ambiente: 'Aula Magna',
        fechaInicio: f.inhabilitado.inicio,
        fechaFin: f.inhabilitado.fin,
        habilitado: false,
        estadoQr: 'INHABILITADO',
        qrDisponibleDesde: f.inhabilitado.disponibleDesde,
        qrVigenteHasta: f.inhabilitado.fin,
        qrGenerado: false,
      },
    ];

    return {
      verificacionFotoActiva,
      examenes,
    };
  }

  async generarQrExamen(
    examenId: number | string,
    _selfie?: Blob | File,
  ): Promise<RespuestaGenerarQrExamen> {
    await new Promise((r) => setTimeout(r, 450));

    if (escenarioActual === 'ERROR_RED') {
      throw new ExamQrError({ codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED });
    }

    if (escenarioActual === 'SIN_ROSTRO') {
      throw new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.SIN_ROSTRO,
        status: 422,
      });
    }

    if (escenarioActual === 'VERIFICACION_FALLIDA_1') {
      throw new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 2,
        status: 422,
      });
    }

    if (escenarioActual === 'VERIFICACION_FALLIDA_2') {
      throw new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 1,
        status: 422,
      });
    }

    if (escenarioActual === 'INTENTOS_AGOTADOS') {
      throw new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_INTENTOS_AGOTADOS,
        intentosRestantes: 0,
        status: 429,
      });
    }

    // Caso QR que vence en vivo (8 segundos a partir de ahora)
    const vigenteHasta =
      escenarioActual === 'QR_VENCE_EN_VIVO'
        ? new Date(Date.now() + 8 * 1000).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const token = `mock-token-examen-${examenId}-${Date.now()}`;
    const qrUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/qr/v/${token}`
      : `https://exacontrol.umss.edu.bo/qr/v/${token}`;

    return {
      qrUrl,
      vigenteHasta,
      token,
    };
  }

  async validarTokenQr(token: string): Promise<ResultadoValidacionQr> {
    await new Promise((r) => setTimeout(r, 200));
    const t = token.toLowerCase();

    if (t.includes('vencido') || t.includes('expirado')) {
      return {
        esValido: false,
        motivoRechazo: 'VENCIDO',
        mensaje: 'El código QR ha expirado porque el examen ya finalizó o superó el tiempo límite de vigencia.',
      };
    }

    if (t.includes('revocado')) {
      return {
        esValido: false,
        motivoRechazo: 'REVOCADO',
        mensaje: 'Este código QR fue invalidado porque se generó uno nuevo o cambiaron las credenciales de seguridad del estudiante.',
      };
    }

    if (t.includes('invalido') || t.includes('inval') || t.includes('corrupto')) {
      return {
        esValido: false,
        motivoRechazo: 'INVALIDO',
        mensaje: 'El código QR no corresponde a un examen registrado o la firma digital no es válida.',
      };
    }

    return {
      esValido: true,
      estudiante: {
        nombre: 'JUAN PÉREZ ROJAS',
        sis: '202001234',
        carrera: 'Ingeniería de Sistemas',
        fotoUrl: null,
      },
      examen: {
        id: 101,
        nombre: 'Primer Parcial - Cálculo II',
        materia: 'Cálculo II',
        grupo: 'Grupo 1',
        ambiente: 'Edif. Nuevo - Aula 691B',
        fecha: new Date().toISOString(),
        horaInicio: '08:15',
        horaFin: '10:15',
        docente: 'Ing. Carlos Mendoza',
        tipoEvaluacion: 'Presencial con verificación biométrica',
      },
      vigenteHasta: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
  }
}

