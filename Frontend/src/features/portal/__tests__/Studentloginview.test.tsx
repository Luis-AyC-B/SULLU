import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { StudentLoginView } from '../components/StudentLoginView';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));

const signInMock = signIn as jest.Mock;

async function llenarYEnviar(sis: string, ci: string) {
  const user = userEvent.setup();
  if (sis) await user.type(screen.getByLabelText('Código SIS'), sis);
  if (ci) await user.type(screen.getByLabelText('CI'), ci);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('IT-PE-01: StudentLoginView + useStudentLogin + studentLoginSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. SIS y CI válidos: autentica con NextAuth y redirige a /portal', async () => {
    signInMock.mockResolvedValue({ ok: true, error: undefined });
    render(<StudentLoginView />);

    await llenarYEnviar('201900123', '8123456');

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/portal'));
    expect(signInMock).toHaveBeenCalledWith('student-credentials', {
      sis: '201900123',
      ci: '8123456',
      redirect: false,
    });
  });

  it('2. credenciales incorrectas: muestra un mensaje genérico y no redirige', async () => {
    signInMock.mockResolvedValue({ ok: false, error: 'INVALID_CREDENTIALS' });
    render(<StudentLoginView />);

    await llenarYEnviar('201900123', '0000000');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Código SIS o CI incorrectos. Verifica tus datos e intenta de nuevo.');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('3. campos vacíos: no envía la solicitud y marca ambos campos', async () => {
    render(<StudentLoginView />);

    await llenarYEnviar('', '');

    expect(await screen.findByText('El código SIS es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El CI es obligatorio')).toBeInTheDocument();
    expect(screen.getByLabelText('Código SIS')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('CI')).toHaveAttribute('aria-invalid', 'true');
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('4. SIS con letras: muestra el error del campo y no envía la solicitud', async () => {
    render(<StudentLoginView />);

    await llenarYEnviar('abc123', '8123456');

    expect(await screen.findByText('El código SIS solo debe contener números')).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('5. acceso bloqueado por intentos fallidos: informa el bloqueo temporal', async () => {
    signInMock.mockResolvedValue({ ok: false, error: 'ACCOUNT_LOCKED' });
    render(<StudentLoginView />);

    await llenarYEnviar('201900123', '8123456');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('bloqueado temporalmente');
    expect(mockPush).not.toHaveBeenCalled();
  });
});