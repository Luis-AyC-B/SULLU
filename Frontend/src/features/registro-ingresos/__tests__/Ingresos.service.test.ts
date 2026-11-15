jest.mock('axios', () => ({
  isAxiosError: (e: unknown) =>
    Boolean((e as { isAxiosError?: boolean } | null)?.isAxiosError),
}));
jest.mock('@/shared/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const ENV_ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCKS;

/** El service lee la variable de entorno al cargarse, así que se reimporta en cada caso. */
async function cargar(forzarMocks: boolean) {
  jest.resetModules();
  process.env.NEXT_PUBLIC_USE_MOCKS = forzarMocks ? 'true' : 'false';
  const { apiClient } = await import('@/shared/lib/api-client');
  const service = await import('../api/ingresos.service');
  return { get: apiClient.get as jest.Mock, ...service };
}

const error404 = { isAxiosError: true, response: { status: 404 } };
const errorRed = { isAxiosError: true, message: 'Network Error' };

const respuestaValida = {
  examenId: 1,
  ingresados: 1,
  total: 10,
  ingresos: [
    { id: 1, hora: '2026-09-06T09:00:00-04:00', sis: '201900123', estudiante: 'Ana Rojas Mamani', metodo: 'QR', estado: 'Habilitado' },
  ],
};

describe('IT-HU11-04: ingresos.service (HTTP, validación y mocks)', () => {
  afterAll(() => {
    process.env.NEXT_PUBLIC_USE_MOCKS = ENV_ORIGINAL;
  });

  it('1. con el endpoint disponible devuelve los datos del back', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockResolvedValue({ data: respuestaValida });

    const resultado = await getIngresosExamen(1);

    expect(get).toHaveBeenCalledWith('/examenes/1/ingresos');
    expect(resultado.total).toBe(10);
    expect(resultado.ingresos[0].sis).toBe('201900123');
  });

  it('2. si el endpoint responde 404 devuelve datos vacíos (listo para backend)', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockRejectedValue(error404);

    const resultado = await getIngresosExamen(1);

    expect(resultado.ingresados).toBe(0);
    expect(resultado.total).toBe(0);
    expect(resultado.ingresos).toHaveLength(0);
  });

  it('3. con 404 la lista de ingresos está vacía', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockRejectedValue(error404);

    const { ingresos } = await getIngresosExamen(1);

    expect(ingresos).toEqual([]);
  });

  it('4. un error de red no cae a datos de prueba y se propaga', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockRejectedValue(errorRed);

    await expect(getIngresosExamen(1)).rejects.toMatchObject({ message: 'Network Error' });
  });

  it('5. una respuesta que no cumple el schema se rechaza', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockResolvedValue({
      data: { ...respuestaValida, ingresos: [{ ...respuestaValida.ingresos[0], metodo: 'Teclado' }] },
    });

    await expect(getIngresosExamen(1)).rejects.toThrow();
  });

  it('6. con NEXT_PUBLIC_USE_MOCKS=true no llama al back', async () => {
    const { get, getIngresosExamen, getExamenesControl } = await cargar(true);

    const ingresos = await getIngresosExamen(1);
    const examenes = await getExamenesControl();

    expect(get).not.toHaveBeenCalled();
    expect(ingresos.ingresados).toBe(42);
    expect(examenes).toHaveLength(3);
  });

  it('7. la lista de exámenes devuelve array vacío si responde 404 (listo para backend)', async () => {
    const { get, getExamenesControl } = await cargar(false);
    get.mockRejectedValue(error404);

    const examenes = await getExamenesControl();

    expect(get).toHaveBeenCalledWith('/examenes/control');
    expect(examenes).toHaveLength(0);
  });

  it('8. con 404 los ingresos devuelven lista vacía y total 0', async () => {
    const { get, getIngresosExamen } = await cargar(false);
    get.mockRejectedValue(error404);

    const resultado = await getIngresosExamen(3);

    expect(resultado.ingresos).toEqual([]);
    expect(resultado.ingresados).toBe(0);
    expect(resultado.total).toBe(0);
  });
});
