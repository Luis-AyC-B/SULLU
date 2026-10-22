import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentQrModal } from '../components/StudentQrModal';
import { getMiQr } from '../api/student-exam.service';

jest.mock('../api/student-exam.service', () => ({ getMiQr: jest.fn() }));
jest.mock('qrcode.react', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    QRCodeCanvas: React.forwardRef<HTMLCanvasElement, { value: string }>(function QRCodeCanvasMock({ value }, ref) {
      return React.createElement('canvas', { ref, 'data-testid': 'qr', 'data-value': value });
    }),
  };
});

const getMiQrMock = getMiQr as jest.Mock;

const QR = {
  nombre: 'Ana Rojas Mamani',
  sis: '201900123',
  ci: '8123456',
  token: 'eyJhbGciOiJIUzI1NiJ9.firmado-por-el-servidor',
};

describe('IT-PE-03: StudentQrModal + getMiQr', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('1. al abrir pide el QR y muestra nombre, SIS, CI y la leyenda de código personal', async () => {
    getMiQrMock.mockResolvedValue(QR);
    render(<StudentQrModal open onClose={jest.fn()} />);

    expect(await screen.findByText('Ana Rojas Mamani')).toBeInTheDocument();
    expect(screen.getByText('SIS: 201900123')).toBeInTheDocument();
    expect(screen.getByText('CI: 8123456')).toBeInTheDocument();
    expect(screen.getByText(/Código personal e intransferible/)).toBeInTheDocument();
    expect(getMiQrMock).toHaveBeenCalledTimes(1);
  });

  it('2. el QR codifica solo el token y no contiene el CI en texto plano', async () => {
    getMiQrMock.mockResolvedValue(QR);
    render(<StudentQrModal open onClose={jest.fn()} />);

    const qr = await screen.findByTestId('qr');
    expect(qr).toHaveAttribute('data-value', QR.token);
    expect(qr.getAttribute('data-value')).not.toContain(QR.ci);
  });

  it('3. el botón "Cerrar" cierra el modal', async () => {
    getMiQrMock.mockResolvedValue(QR);
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<StudentQrModal open onClose={onClose} />);
    await screen.findByTestId('qr');

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('4. el enlace "← Mis exámenes" (móvil) regresa a la lista', async () => {
    getMiQrMock.mockResolvedValue(QR);
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<StudentQrModal open onClose={onClose} />);
    await screen.findByTestId('qr');

    await user.click(screen.getByRole('button', { name: 'Mis exámenes' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('5. si falla la generación muestra el error y "Reintentar" vuelve a pedir el QR', async () => {
    getMiQrMock.mockRejectedValueOnce(new Error('NETWORK_ERROR')).mockResolvedValueOnce(QR);
    const user = userEvent.setup();
    render(<StudentQrModal open onClose={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos generar tu código QR.');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ana Rojas Mamani')).toBeInTheDocument();
    expect(getMiQrMock).toHaveBeenCalledTimes(2);
  });

  it('6. "Descargar QR" baja el QR como imagen PNG con el SIS en el nombre del archivo', async () => {
    getMiQrMock.mockResolvedValue(QR);
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<StudentQrModal open onClose={jest.fn()} />);
    await screen.findByTestId('qr');

    await user.click(screen.getByRole('button', { name: /Descargar QR/ }));

    const descargado = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(descargado.download).toBe('QR-201900123.png');
    expect(descargado.href).toContain('data:image/png');
  });

  it('7. mientras carga o si falla no se ofrece descargar el QR', async () => {
    getMiQrMock.mockRejectedValue(new Error('NETWORK_ERROR'));
    render(<StudentQrModal open onClose={jest.fn()} />);

    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /Descargar QR/ })).not.toBeInTheDocument();
  });

  it('8. con el modal cerrado no solicita el QR ni renderiza contenido', () => {
    render(<StudentQrModal open={false} onClose={jest.fn()} />);

    expect(getMiQrMock).not.toHaveBeenCalled();
    expect(screen.queryByText('CÓDIGO QR · ESTUDIANTE')).not.toBeInTheDocument();
  });

  it('9. sin conexión pero con QR en caché: muestra el QR offline con aviso controlado', async () => {
    localStorage.setItem(
      'exacontrol_offline_qr',
      JSON.stringify({ data: QR, cachedAt: new Date().toISOString() }),
    );
    getMiQrMock.mockRejectedValue(new Error('NETWORK_ERROR'));
    render(<StudentQrModal open onClose={jest.fn()} />);

    expect(await screen.findByText('Ana Rojas Mamani')).toBeInTheDocument();
    expect(
      screen.getByText(/sin conexión, mostrando credencial QR guardada/i),
    ).toBeInTheDocument();
  });
});