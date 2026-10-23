import {
  adaptarRespuestaExamenes,
  calcularEstadoQrTemporal,
} from '../lib/adaptador-examenes';
import {
  CODIGOS_ERROR_QR_EXAMEN,
  ExamQrError,
  type EstadoQr,
} from '../types/qr-examen';
import {
  MockExamQrService,
  setEscenarioMock,
} from '../api/mock-exam-qr.service';

describe('Bloque 1: Contrato de Tipos, Adaptador y Capa de Servicio', () => {
  describe('1. Adaptador de compatibilidad (Forma antigua vs Nueva)', () => {
    it('debe calcular temporalmente el estadoQr si el servidor no lo envía y respetar cuando sí lo envía', () => {
      // Examen dentro de las 24 horas
      const ahora = new Date();
      const horaEn2Horas = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
      const horaEn4Horas = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
      const horaEn50Horas = new Date(ahora.getTime() + 50 * 60 * 60 * 1000);

      const formaAntigua = [
        {
          id: 1,
          carrera: 'Ingeniería de Sistemas',
          nombre: 'Cálculo II',
          ambiente: 'Aula 203',
          facultad: 'FCyT',
          fecha: horaEn2Horas.toISOString().slice(0, 10),
          horaInicio: horaEn2Horas.toTimeString().slice(0, 5),
          horaFin: horaEn4Horas.toTimeString().slice(0, 5),
          estado: 'Habilitado' as const,
        },
        {
          id: 2,
          carrera: 'Ingeniería de Sistemas',
          nombre: 'Física I',
          ambiente: 'Aula 101',
          fecha: horaEn50Horas.toISOString().slice(0, 10),
          horaInicio: '14:00',
          horaFin: '16:00',
          estado: 'Inhabilitado' as const,
        },
        {
          id: 3,
          carrera: 'Ingeniería Informática',
          nombre: 'Redes I',
          ambiente: 'Lab Redes',
          fecha: horaEn50Horas.toISOString().slice(0, 10),
          horaInicio: '08:00',
          horaFin: '10:00',
          estado: 'Habilitado' as const,
        },
      ];

      const resultado = adaptarRespuestaExamenes(formaAntigua);

      expect(resultado.verificacionFotoActiva).toBe(false);
      expect(resultado.examenes).toHaveLength(3);

      const primero = resultado.examenes[0];
      expect(primero.id).toBe(1);
      expect(primero.nombre).toBe('Cálculo II');
      expect(primero.habilitado).toBe(true);
      expect(primero.estadoQr).toBe<EstadoQr>('DISPONIBLE');
      expect(primero.esLegado).toBe(true);

      const segundo = resultado.examenes[1];
      expect(segundo.id).toBe(2);
      expect(segundo.habilitado).toBe(false);
      expect(segundo.estadoQr).toBe<EstadoQr>('INHABILITADO');
      expect(segundo.esLegado).toBe(true);

      const tercero = resultado.examenes[2];
      expect(tercero.id).toBe(3);
      expect(tercero.habilitado).toBe(true);
      // Está a más de 24 horas del examen
      expect(tercero.estadoQr).toBe<EstadoQr>('NO_DISPONIBLE_AUN');
    });

    it('la función temporal nunca pisa un estadoQr enviado por el servidor', () => {
      const examenConEstadoServidor = [
        {
          id: 5,
          carrera: 'Ingeniería',
          nombre: 'Química',
          ambiente: 'Aula 5',
          fechaInicio: '2099-01-01T08:00:00Z',
          fechaFin: '2099-01-01T10:00:00Z',
          habilitado: true,
          estadoQr: 'DISPONIBLE' as EstadoQr,
        },
      ];

      const resultado = adaptarRespuestaExamenes(examenConEstadoServidor);
      expect(resultado.examenes[0].estadoQr).toBe('DISPONIBLE');
    });

    it('debe respetar la estructura nueva de HU6 cuando el backend la retorne', () => {
      const respuestaNueva = {
        verificacionFotoActiva: true,
        examenes: [
          {
            id: 10,
            carrera: 'Ingeniería Informática',
            nombre: 'Base de Datos II',
            ambiente: 'Lab TIC 1',
            fechaInicio: '2026-10-22T08:00:00Z',
            fechaFin: '2026-10-22T10:00:00Z',
            habilitado: true,
            estadoQr: 'NO_DISPONIBLE_AUN' as EstadoQr,
            qrDisponibleDesde: '2026-10-21T08:00:00Z',
            qrVigenteHasta: '2026-10-22T10:00:00Z',
            qrGenerado: false,
          },
        ],
      };

      const resultado = adaptarRespuestaExamenes(respuestaNueva);
      expect(resultado.verificacionFotoActiva).toBe(true);
      expect(resultado.examenes).toHaveLength(1);
      expect(resultado.examenes[0].estadoQr).toBe('NO_DISPONIBLE_AUN');
      expect(resultado.examenes[0].esLegado).toBeUndefined();
    });

    it('debe manejar entradas vacías o nulas sin romper la aplicación', () => {
      expect(adaptarRespuestaExamenes(null)).toEqual({
        verificacionFotoActiva: false,
        examenes: [],
      });
      expect(adaptarRespuestaExamenes(undefined)).toEqual({
        verificacionFotoActiva: false,
        examenes: [],
      });
      expect(adaptarRespuestaExamenes([])).toEqual({
        verificacionFotoActiva: false,
        examenes: [],
      });
    });
  });

  describe('2. Servicio Simulado (MockExamQrService)', () => {
    let mockService: MockExamQrService;

    beforeEach(() => {
      mockService = new MockExamQrService();
    });

    it('debe devolver los 5 estados a la vez en el escenario TODOS_LOS_ESTADOS', async () => {
      setEscenarioMock('TODOS_LOS_ESTADOS');
      const data = await mockService.getExamenes();

      expect(data.verificacionFotoActiva).toBe(true);
      expect(data.examenes).toHaveLength(5);

      const estados = data.examenes.map((e) => e.estadoQr);
      expect(estados).toContain<EstadoQr>('NO_DISPONIBLE_AUN');
      expect(estados).toContain<EstadoQr>('DISPONIBLE');
      expect(estados).toContain<EstadoQr>('GENERADO');
      expect(estados).toContain<EstadoQr>('FINALIZADO');
      expect(estados).toContain<EstadoQr>('INHABILITADO');
    });

    it('debe devolver lista vacía en el escenario LISTA_VACIA', async () => {
      setEscenarioMock('LISTA_VACIA');
      const data = await mockService.getExamenes();
      expect(data.examenes).toEqual([]);
    });

    it('debe lanzar error de red en el escenario ERROR_RED', async () => {
      setEscenarioMock('ERROR_RED');
      await expect(mockService.getExamenes()).rejects.toThrow(ExamQrError);
      await expect(mockService.getExamenes()).rejects.toMatchObject({
        codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED,
      });
    });

    it('debe manejar verificación fallida con intentos restantes', async () => {
      setEscenarioMock('VERIFICACION_FALLIDA_1');
      await expect(mockService.generarQrExamen(102)).rejects.toMatchObject({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 2,
        status: 422,
      });

      setEscenarioMock('VERIFICACION_FALLIDA_2');
      await expect(mockService.generarQrExamen(102)).rejects.toMatchObject({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 1,
        status: 422,
      });
    });

    it('debe manejar intentos agotados con código VERIFICACION_INTENTOS_AGOTADOS y status 429', async () => {
      setEscenarioMock('INTENTOS_AGOTADOS');
      await expect(mockService.generarQrExamen(102)).rejects.toMatchObject({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_INTENTOS_AGOTADOS,
        intentosRestantes: 0,
        status: 429,
      });
    });

    it('debe manejar escenario SIN_ROSTRO', async () => {
      setEscenarioMock('SIN_ROSTRO');
      await expect(mockService.generarQrExamen(102)).rejects.toMatchObject({
        codigo: CODIGOS_ERROR_QR_EXAMEN.SIN_ROSTRO,
        status: 422,
      });
    });

    it('debe generar QR exitoso con URL y vigencia', async () => {
      setEscenarioMock('VERIFICACION_EXITOSA');
      const res = await mockService.generarQrExamen(102);

      expect(res.qrUrl).toContain('/qr/v/');
      expect(res.vigenteHasta).toBeDefined();
      expect(new Date(res.vigenteHasta).getTime()).toBeGreaterThan(Date.now());
    });

    it('debe simular QR que vence en 8 segundos en el escenario QR_VENCE_EN_VIVO', async () => {
      setEscenarioMock('QR_VENCE_EN_VIVO');
      const res = await mockService.generarQrExamen(102);
      const diffMs = new Date(res.vigenteHasta).getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(0);
      expect(diffMs).toBeLessThanOrEqual(9000);
    });
  });
});

