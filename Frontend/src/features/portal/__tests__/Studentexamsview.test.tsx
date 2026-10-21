import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentExamsView } from '../components/StudentExamsView';
import { getMisExamenes, getMiQr } from '../api/student-exam.service';
import type { ExamenEstudiante } from '../types/student-exam.types';

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: () => null,
}));
jest.mock('../api/student-exam.service', () => ({
  getMisExamenes: jest.fn(),
  getMiQr: jest.fn(),
}));

const getMisExamenesMock = getMisExamenes as jest.Mock;
const getMiQrMock = getMiQr as jest.Mock;

const base = { carrera: 'Ingeniería de Sistemas', facultad: 'FCyT', estado: 'Habilitado' as const };
const EXAMENES: ExamenEstudiante[] = [
  { ...base, id: 1, nombre: 'Cálculo II – Examen Final', ambiente: 'Aula 203', fecha: '2026-09-06', horaInicio: '09:00', horaFin: '11:00' },
  { ...base, id: 2, nombre: 'Redes de Computadoras – Primer parcial', ambiente: 'Laboratorio Informática 2', fecha: '2026-09-10', horaInicio: '14:00', horaFin: '16:00' },
  { ...base, id: 3, nombre: 'Administración II – Examen final', ambiente: 'Aula 101', facultad: 'FCE', fecha: '2026-09-14', horaInicio: '08:00', horaFin: '10:00' },
];

describe('IT-PE-02: StudentExamsView + useStudentExams + ExamCard', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('1. estudiante habilitado en 3 exámenes: muestra una tarjeta por examen', async () => {
    getMisExamenesMock.mockResolvedValue(EXAMENES);
    render(<StudentExamsView />);

    const tarjetas = await screen.findAllByRole('article');
    expect(tarjetas).toHaveLength(3);
    expect(within(tarjetas[0]).getByText('Cálculo II – Examen Final')).toBeInTheDocument();
    expect(within(tarjetas[1]).getByText('Laboratorio Informática 2 (FCyT)')).toBeInTheDocument();
    expect(within(tarjetas[2]).getByText('14/09/2026')).toBeInTheDocument();
    expect(screen.getAllByText('Habilitado')).toHaveLength(3);
  });

  it('2. mientras consulta la lista muestra el estado de carga', async () => {
    getMisExamenesMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<StudentExamsView />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('3. sin exámenes habilitados: muestra el mensaje y mantiene el botón "Generar QR"', async () => {
    getMisExamenesMock.mockResolvedValue([]);
    render(<StudentExamsView />);

    expect(await screen.findByText('No tienes exámenes habilitados por el momento.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generar QR/ })).toBeEnabled();
  });

  it('4. falla la conexión: muestra un error controlado y "Reintentar" vuelve a cargar', async () => {
    getMisExamenesMock
      .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
      .mockResolvedValueOnce(EXAMENES);
    const user = userEvent.setup();
    render(<StudentExamsView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus exámenes');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findAllByRole('article')).toHaveLength(3);
    expect(getMisExamenesMock).toHaveBeenCalledTimes(2);
  });

  it('5. el botón "Generar QR" abre el modal del código QR personal', async () => {
    getMisExamenesMock.mockResolvedValue(EXAMENES);
    getMiQrMock.mockResolvedValue({ nombre: 'Ana Rojas Mamani', sis: '201900123', ci: '8123456', token: 'tok' });
    const user = userEvent.setup();
    render(<StudentExamsView />);
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('button', { name: /Generar QR/ }));

    expect(await screen.findByText('CÓDIGO QR · ESTUDIANTE')).toBeInTheDocument();
    await waitFor(() => expect(getMiQrMock).toHaveBeenCalledTimes(1));
  });

  it('6. sin conexión pero con exámenes en caché: muestra los exámenes guardados y el aviso offline', async () => {
    localStorage.setItem(
      'exacontrol_offline_examenes',
      JSON.stringify({ data: EXAMENES, cachedAt: '2026-10-21T08:00:00.000Z' }),
    );
    getMisExamenesMock.mockRejectedValue(new Error('NETWORK_ERROR'));
    render(<StudentExamsView />);

    const tarjetas = await screen.findAllByRole('article');
    expect(tarjetas).toHaveLength(3);
    expect(
      screen.getByText(/Estás sin conexión, mostrando datos guardados/),
    ).toBeInTheDocument();
  });
});