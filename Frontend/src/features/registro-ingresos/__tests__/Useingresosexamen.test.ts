import { act, renderHook } from '@testing-library/react';
import { useIngresosExamen } from '../hooks/useIngresosExamen';
import { getIngresosExamen } from '../api/ingresos.service';
import type { IngresosExamen } from '../types/ingresos.types';

jest.mock('../api/ingresos.service', () => ({ getIngresosExamen: jest.fn() }));

const mockGet = getIngresosExamen as jest.MockedFunction<typeof getIngresosExamen>;

const examen1: IngresosExamen = {
  examenId: 1,
  ingresados: 42,
  total: 85,
  ingresos: [
    { id: 1, hora: '2026-09-06T09:04:32-04:00', sis: '201900123', estudiante: 'Ana Rojas Mamani', metodo: 'QR', estado: 'Habilitado' },
  ],
};
const examen2: IngresosExamen = { examenId: 2, ingresados: 2, total: 60, ingresos: [] };

const avanzar = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

describe('IT-HU11-05: useIngresosExamen (polling y estado de conexión)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGet.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('1. carga los ingresos al montar', async () => {
    mockGet.mockResolvedValue(examen1);
    const { result } = renderHook(() => useIngresosExamen('1'));

    expect(result.current.data).toBeNull();
    expect(result.current.conexion).toBe('conectado');

    await avanzar(0);

    expect(mockGet).toHaveBeenCalledWith('1');
    expect(result.current.data).toEqual(examen1);
  });

  it('2. vuelve a consultar cada 5 segundos', async () => {
    mockGet.mockResolvedValue(examen1);
    renderHook(() => useIngresosExamen('1'));

    await avanzar(0);
    expect(mockGet).toHaveBeenCalledTimes(1);
    await avanzar(5000);
    expect(mockGet).toHaveBeenCalledTimes(2);
    await avanzar(5000);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('3. tras 3 fallos seguidos pasa a desconectado y conserva los datos', async () => {
    mockGet.mockResolvedValueOnce(examen1).mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useIngresosExamen('1'));

    await avanzar(0);
    await avanzar(5000);
    await avanzar(5000);
    expect(result.current.conexion).toBe('conectado');

    await avanzar(5000);
    expect(result.current.conexion).toBe('desconectado');
    expect(result.current.data).toEqual(examen1);
  });

  it('4. se reconecta cuando una consulta vuelve a funcionar', async () => {
    mockGet.mockResolvedValueOnce(examen1).mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useIngresosExamen('1'));

    await avanzar(0);
    await avanzar(15000);
    expect(result.current.conexion).toBe('desconectado');

    mockGet.mockResolvedValue(examen1);
    await avanzar(5000);
    expect(result.current.conexion).toBe('conectado');
  });

  it('5. al cambiar de examen consulta y muestra los datos del nuevo examen', async () => {
    mockGet.mockImplementation(async (id) => (String(id) === '1' ? examen1 : examen2));
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useIngresosExamen(id),
      { initialProps: { id: '1' } },
    );
    await avanzar(0);
    expect(result.current.data?.examenId).toBe(1);

    rerender({ id: '2' });
    await avanzar(0);

    expect(mockGet).toHaveBeenLastCalledWith('2');
    expect(result.current.data?.examenId).toBe(2);
  });

  it('6. descarta la respuesta tardía de un examen anterior', async () => {
    let resolverTardia!: (v: IngresosExamen) => void;
    const tardia = new Promise<IngresosExamen>((resolve) => {
      resolverTardia = resolve;
    });
    mockGet.mockImplementation((id) => (String(id) === '1' ? tardia : Promise.resolve(examen2)));

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useIngresosExamen(id),
      { initialProps: { id: '1' } },
    );
    rerender({ id: '2' });
    await avanzar(0);

    await act(async () => {
      resolverTardia(examen1);
      await Promise.resolve();
    });

    expect(result.current.data?.examenId).toBe(2);
  });

  it('7. sin examen seleccionado no consulta al servidor', async () => {
    const { result } = renderHook(() => useIngresosExamen(null));

    await avanzar(10000);

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('8. al desmontar deja de consultar', async () => {
    mockGet.mockResolvedValue(examen1);
    const { unmount } = renderHook(() => useIngresosExamen('1'));
    await avanzar(0);
    expect(mockGet).toHaveBeenCalledTimes(1);

    unmount();
    await avanzar(10000);

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});