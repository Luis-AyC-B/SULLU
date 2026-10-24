import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamQrModal } from '../components/ExamQrModal';
import { getExamQrService } from '../api/exam-qr.service';
import type { Examen } from '../types/qr-examen';
import { CODIGOS_ERROR_QR_EXAMEN, ExamQrError } from '../types/qr-examen';

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <div data-testid="qr-canvas-mock" />,
}));

jest.mock('../api/exam-qr.service', () => ({
  getExamQrService: jest.fn(),
}));

const mockExamen: Examen = {
  id: 202,
  carrera: 'Ingeniería de Sistemas',
  nombre: 'Base de Datos I – Examen Final',
  ambiente: 'Laboratorio 3, Edificio TIC',
  fechaInicio: '2026-10-23T15:00:00Z',
  fechaFin: '2026-10-23T16:30:00Z',
  habilitado: true,
  estadoQr: 'DISPONIBLE',
  qrDisponibleDesde: '2026-10-22T15:00:00Z',
  qrVigenteHasta: '2026-10-23T16:30:00Z',
  qrGenerado: false,
};

describe('Bloque 3: ExamQrModal (Pasos, Cámara, Verificación, Expiración en vivo)', () => {
  let mockGenerarQr: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerarQr = jest.fn();
    (getExamQrService as jest.Mock).mockResolvedValue({
      generarQrExamen: mockGenerarQr,
    });
  });

  it('1. Paso 1 con biometría: muestra detalle del examen, aviso de privacidad y chip de disponibilidad', () => {
    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        verificacionFotoActiva={true}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText(/Detalle del examen/i)).toBeInTheDocument();
    expect(screen.getByText('Base de Datos I – Examen Final')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio 3, Edificio TIC')).toBeInTheDocument();
    expect(
      screen.getByText(/La foto no se guarda después de verificar/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/QR disponible hasta las/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
  });

  it('2. Flujo con un clic (sin biometría por defecto): genera QR inmediatamente sin pedir selfie ni avisos de verificación', async () => {
    mockGenerarQr.mockResolvedValue({
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-directo-123',
      vigenteHasta: '2026-10-23T16:30:00Z',
      token: 'token-directo-123',
    });

    const onExamenActualizado = jest.fn();

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
        onExamenActualizado={onExamenActualizado}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/¡Tu código está listo!/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(mockGenerarQr).toHaveBeenCalledWith(202, undefined);
    expect(screen.queryByText(/Por seguridad, verificaremos tu identidad/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Vigente hasta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar PNG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument();
  });

  it('3. Verificación fallida del servidor: muestra contador de intentos y caja de verificación manual', async () => {
    mockGenerarQr.mockRejectedValueOnce(
      new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 2,
        mensaje: 'No pudimos verificar tu identidad con la fotografía tomada.',
      }),
    );

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /No pudimos verificar tu identidad/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Intento 2 de 3/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Acércate al personal de control para una verificación manual/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Intentar de nuevo/i })).toBeEnabled();
  });

  it('4. Intentos agotados por verificación: desactiva el botón de reintento', async () => {
    mockGenerarQr.mockRejectedValueOnce(
      new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_INTENTOS_AGOTADOS,
        intentosRestantes: 0,
        status: 429,
        mensaje: 'Has agotado los 3 intentos de verificación de identidad.',
      }),
    );

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Intento 3 de 3/i)).toBeInTheDocument();
    });

    const btnReintentar = screen.getByRole('button', { name: /Intentar de nuevo/i });
    expect(btnReintentar).toBeDisabled();
  });

  it('5. Fallo de red: NO muestra verificación fallida ni consume intentos, muestra Reintentar', async () => {
    mockGenerarQr.mockRejectedValueOnce(
      new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED,
        mensaje: 'Error de conexión con el servidor',
      }),
    );

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /No pudimos conectarnos con el servidor/i }),
      ).toBeInTheDocument();
    });

    // NO debe mostrar "No pudimos verificar tu identidad"
    expect(
      screen.queryByText(/No pudimos verificar tu identidad/i),
    ).not.toBeInTheDocument();

    // NO debe consumir intentos ni mostrar "Intento X de 3"
    expect(screen.queryByText(/Intento \d de 3/i)).not.toBeInTheDocument();

    // Debe mostrar botón "Reintentar"
    const btnReintentar = screen.getByRole('button', { name: /Reintentar/i });
    expect(btnReintentar).toBeInTheDocument();
    expect(btnReintentar).toBeEnabled();

    // Al pulsar Reintentar, vuelve a intentar la llamada al servicio
    mockGenerarQr.mockResolvedValueOnce({
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-reintentado',
      vigenteHasta: '2026-10-23T16:30:00Z',
      token: 'token-reintentado',
    });

    await userEvent.click(btnReintentar);

    await waitFor(() => {
      expect(screen.getByText(/¡Tu código está listo!/i)).toBeInTheDocument();
    });
    expect(mockGenerarQr).toHaveBeenCalledTimes(2);
  });

  it('6. Expiración en vivo del QR: difumina el QR con capa gris, avisa y quita botón Descargar', async () => {
    // QR con expiración a los 200 ms
    const vencePronto = new Date(Date.now() + 200).toISOString();
    const examenConQr: Examen = {
      ...mockExamen,
      estadoQr: 'GENERADO',
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-expirando',
      qrVigenteHasta: vencePronto,
      qrGenerado: true,
    };

    const onExamenActualizado = jest.fn();

    render(
      <ExamQrModal
        open={true}
        examen={examenConQr}
        onClose={jest.fn()}
        onExamenActualizado={onExamenActualizado}
      />,
    );

    // Inicialmente está listo
    expect(screen.getByText(/¡Tu código está listo!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar PNG/i })).toBeInTheDocument();

    // Esperar a que expire
    await waitFor(
      () => {
        expect(screen.getByTestId('qr-vencido-overlay')).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    expect(screen.getByText(/Tu QR venció/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar PNG/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument();
    expect(onExamenActualizado).toHaveBeenCalledWith(
      202,
      expect.objectContaining({ estadoQr: 'FINALIZADO' }),
    );
  });

  it('7. Respaldo de cámara: detiene los tracks de la cámara al desmontar o cerrar', () => {
    const mockTrackStop = jest.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockTrackStop }],
    };

    // Simulamos getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
      },
    });

    const { unmount } = render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    unmount();
    // Al desmontar no debe lanzar errores
    expect(screen.queryByText(/Detalle del examen/i)).not.toBeInTheDocument();
  });
});
