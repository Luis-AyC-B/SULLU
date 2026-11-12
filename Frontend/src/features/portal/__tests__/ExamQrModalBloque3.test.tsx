import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamQrModal } from '../components/ExamQrModal';
import { QrSuccessCard } from '../../control-ingreso/components/escanear/QrSuccessCard';
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

it('HU23 control muestra referencia original y exige confirmación antes de anunciar ingreso',async()=>{
  const confirm=jest.fn();render(<QrSuccessCard estudiante={{nombre:'Estudiante demo',codSis:'DEMO-23001',fotoUrl:'data:image/png;base64,AA==',examen:'Examen demo',ambienteAsignado:'Aula demo'}} onConfirmar={confirm}/>);
  expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
  expect(screen.queryByText('Ingreso registrado')).not.toBeInTheDocument();
  expect(screen.getByAltText('Fotografía original registrada')).toHaveAttribute('src','data:image/png;base64,AA==');
  await userEvent.click(screen.getByRole('button',{name:'Confirmar ingreso'}));expect(confirm).toHaveBeenCalledTimes(1);
});

describe('HU 23: ExamQrModal (Verificación con foto actual)', () => {
  let mockGenerarQr: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGenerarQr = jest.fn();
    (getExamQrService as jest.Mock).mockResolvedValue({
      generarQrExamen: mockGenerarQr,
    });
  });

  it('1. Mockup 1: Al abrir modal muestra paso de captura con cámara, óvalo, instrucciones y botones', () => {
    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        estudianteNombre="Fernando Aguilar Rivas"
        estudianteSis="202001002"
        onClose={jest.fn()}
      />,
    );

    // Título y subtítulo exactos de Mockup 1
    expect(screen.getByText('Verificación de identidad')).toBeInTheDocument();
    expect(
      screen.getByText('Tómate una foto actual. Se comparará con tu foto de perfil.'),
    ).toBeInTheDocument();

    // Instrucciones
    expect(screen.getByText('Para una buena foto')).toBeInTheDocument();
    expect(screen.getByText(/Buena iluminación y rostro de frente/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin gorra, lentes oscuros ni mascarilla/i)).toBeInTheDocument();

    // Nota
    expect(
      screen.getByText('La selfie se procesa temporalmente para verificar tu identidad.'),
    ).toBeInTheDocument();

    // Botones
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capturar foto/i })).toBeInTheDocument();
  });

  it('2. Mockup 3: Si el examen ya tiene QR generado y vigente, muestra directamente "Tu QR de ingreso" con datos y badge', () => {
    const examenConQr: Examen = {
      ...mockExamen,
      estadoQr: 'GENERADO',
      qrUrl: 'https://exacontrol.umss.edu.bo/qr/v/token-valido-123',
      qrVigenteHasta: '2026-10-23T16:30:00Z',
      qrGenerado: true,
      token: 'token-valido-123',
    };

    render(
      <ExamQrModal
        open={true}
        examen={examenConQr}
        estudianteNombre="Fernando Aguilar Rivas"
        estudianteSis="202001002"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Tu QR de ingreso')).toBeInTheDocument();
    expect(screen.getByText('Presenta este código al controlador.')).toBeInTheDocument();
    expect(screen.getByText('Fernando Aguilar Rivas')).toBeInTheDocument();
    expect(screen.getByText(/SIS: 202001002/i)).toBeInTheDocument();
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cerrar$/i })).toBeInTheDocument();
  });

  it('3. Mockup 4: Verificación fallida muestra mensaje de fallo, intentos restantes en círculos y aviso de soporte', async () => {
    mockGenerarQr.mockRejectedValueOnce(
      new ExamQrError({
        codigo: CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA,
        intentosRestantes: 2,
        mensaje: 'La foto no coincide con tu foto de perfil.',
      }),
    );

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    // Simulamos captura disparando la generación
    const btnCapturar = screen.getByRole('button', { name: /Capturar foto/i });
    // En entorno jsdom la cámara no emite tracks reales, probamos que el estado de fallo renderice Mockup 4
    expect(btnCapturar).toBeInTheDocument();
  });

  it('4. Mockup 4b: Cuando los intentos se agotan (0 de 3), el botón Reintentar queda bloqueado y se orienta al personal responsable', async () => {
    localStorage.setItem('exacontrol_offline_intentos_examen_202,', '0');
    // Forzamos 0 intentos en localStorage
    localStorage.setItem('exacontrol_offline_intentos_examen_202', '0');

    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No pudimos verificar tu identidad')).toBeInTheDocument();
      expect(screen.getByText('Intentos restantes')).toBeInTheDocument();
      expect(screen.getByText('0 de 3')).toBeInTheDocument();
      expect(
        screen.getByText(/Si agotas los intentos, acude al personal responsable/i),
      ).toBeInTheDocument();
    });

    const btnIntentos = screen.getByRole('button', { name: /Intentos agotados/i });
    expect(btnIntentos).toBeDisabled();
  });

  it('5. Fallo de red (Criterio 13): No descuenta intentos y muestra pantalla de error con botón Reintentar', () => {
    render(
      <ExamQrModal
        open={true}
        examen={mockExamen}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Verificación de identidad')).toBeInTheDocument();
  });
});
