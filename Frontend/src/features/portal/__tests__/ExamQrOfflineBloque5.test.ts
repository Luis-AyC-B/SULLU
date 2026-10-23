import {
  CACHED_EXAM_QRS_KEY,
  CACHED_EXAMENES_KEY,
  CACHED_QR_KEY,
  guardarExamenesOffline,
  guardarQrExamenOffline,
  guardarQrOffline,
  limpiarCacheOfflineEstudiante,
  obtenerExamenesOffline,
  obtenerQrExamenOffline,
  obtenerQrOffline,
  obtenerTodosQrsExamenOffline,
  purgarQrsExamenVencidos,
} from '../lib/offline-portal';
import type { Examen } from '../types/qr-examen';
import type { StudentQrPayload } from '../types/student-exam.types';

describe('Bloque 5: Caché Offline y Purga de QRs de Examen Vencidos', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('1. Guarda y recupera QR de examen si está vigente; retorna null si ya venció', () => {
    const ahora = new Date();
    const vigenteHastaFuturo = new Date(ahora.getTime() + 60 * 60 * 1000).toISOString();
    const vencidoHastaPasado = new Date(ahora.getTime() - 60 * 60 * 1000).toISOString();

    guardarQrExamenOffline(101, {
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-vigente',
      vigenteHasta: vigenteHastaFuturo,
      token: 'token-vigente',
    });

    guardarQrExamenOffline(102, {
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-vencido',
      vigenteHasta: vencidoHastaPasado,
      token: 'token-vencido',
    });

    const qr101 = obtenerQrExamenOffline(101);
    expect(qr101).not.toBeNull();
    expect(qr101?.token).toBe('token-vigente');

    const qr102 = obtenerQrExamenOffline(102);
    expect(qr102).toBeNull(); // No se debe entregar un QR vencido
  });

  it('2. purgarQrsExamenVencidos: elimina solo los QRs expirados y preserva los vigentes', () => {
    const fechaRef = new Date('2026-10-22T12:00:00Z');

    // QR 1: venció a las 10:00
    guardarQrExamenOffline(1, {
      qrUrl: 'url-1',
      vigenteHasta: '2026-10-22T10:00:00Z',
    });

    // QR 2: venció a las 11:59
    guardarQrExamenOffline(2, {
      qrUrl: 'url-2',
      vigenteHasta: '2026-10-22T11:59:00Z',
    });

    // QR 3: vigente hasta las 14:00
    guardarQrExamenOffline(3, {
      qrUrl: 'url-3',
      vigenteHasta: '2026-10-22T14:00:00Z',
    });

    const purgados = purgarQrsExamenVencidos(fechaRef);
    expect(purgados).toBe(2);

    const todos = obtenerTodosQrsExamenOffline();
    expect(todos['1']).toBeUndefined();
    expect(todos['2']).toBeUndefined();
    expect(todos['3']).toBeDefined();
    expect(todos['3'].qrUrl).toBe('url-3');
  });

  it('3. Actualiza los exámenes cacheados: los QRs vencidos pasan a FINALIZADO sin QR', () => {
    const fechaRef = new Date('2026-10-22T12:00:00Z');

    const listaExamenes: Partial<Examen>[] = [
      {
        id: 10,
        nombre: 'Cálculo I',
        qrGenerado: true,
        qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-calc',
        qrVigenteHasta: '2026-10-22T10:00:00Z', // vencido
        estadoQr: 'GENERADO',
      },
      {
        id: 20,
        nombre: 'Física I',
        qrGenerado: true,
        qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-fis',
        qrVigenteHasta: '2026-10-22T16:00:00Z', // vigente
        estadoQr: 'GENERADO',
      },
    ];

    guardarExamenesOffline(listaExamenes as Examen[]);

    purgarQrsExamenVencidos(fechaRef);

    const cached = obtenerExamenesOffline();
    expect(cached).not.toBeNull();
    const data = cached!.data as Examen[];

    const ex10 = data.find((e) => e.id === 10)!;
    expect(ex10.qrGenerado).toBe(false);
    expect(ex10.qrUrl).toBeNull();
    expect(ex10.estadoQr).toBe('FINALIZADO');

    const ex20 = data.find((e) => e.id === 20)!;
    expect(ex20.qrGenerado).toBe(true);
    expect(ex20.qrUrl).toBe('https://exacontrol.umss.edu.bo/qr/v/token-fis');
    expect(ex20.estadoQr).toBe('GENERADO');
  });

  it('4. REGLA CRÍTICA: El QR personal NUNCA se purga por expiración de examen', () => {
    const qrPersonal: StudentQrPayload = {
      token: 'jwt-mock-qr-personal',
      sis: '202001234',
      nombre: 'ESTUDIANTE EJEMPLO',
      ci: '12345678',
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/jwt-mock-qr-personal',
    };

    guardarQrOffline(qrPersonal);

    // Guardamos un QR de examen vencido
    guardarQrExamenOffline(99, {
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-expirado',
      vigenteHasta: '2026-01-01T00:00:00Z',
    });

    // Purgamos con fecha actual
    purgarQrsExamenVencidos(new Date());

    // El QR personal debe seguir 100% intacto en almacenamiento local
    const qrPersonalRecuperado = obtenerQrOffline();
    expect(qrPersonalRecuperado).not.toBeNull();
    expect(qrPersonalRecuperado?.data.sis).toBe('202001234');
    expect(qrPersonalRecuperado?.data.token).toBe('jwt-mock-qr-personal');
  });

  it('5. limpiarCacheOfflineEstudiante: borra exámenes, QR personal y QRs de examen', () => {
    guardarExamenesOffline([]);
    guardarQrOffline({
      token: 'token-personal',
      sis: '123',
      nombre: 'Name',
      ci: '87654321',
    });
    guardarQrExamenOffline(1, { qrUrl: 'url', vigenteHasta: '2026-12-31' });

    expect(localStorage.getItem(CACHED_EXAMENES_KEY)).not.toBeNull();
    expect(localStorage.getItem(CACHED_QR_KEY)).not.toBeNull();
    expect(localStorage.getItem(CACHED_EXAM_QRS_KEY)).not.toBeNull();

    limpiarCacheOfflineEstudiante();

    expect(localStorage.getItem(CACHED_EXAMENES_KEY)).toBeNull();
    expect(localStorage.getItem(CACHED_QR_KEY)).toBeNull();
    expect(localStorage.getItem(CACHED_EXAM_QRS_KEY)).toBeNull();
  });
});
