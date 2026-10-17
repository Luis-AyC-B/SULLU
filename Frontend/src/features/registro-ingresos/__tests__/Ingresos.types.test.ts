import {
  formatFechaExamen,
  formatHoraIngreso,
  ingresoSchema,
  ingresosExamenSchema,
  labelExamen,
} from '../types/ingresos.types';

const ingresoValido = {
  id: 1,
  hora: '2026-09-06T09:04:32-04:00',
  sis: '201900123',
  estudiante: 'Ana Rojas Mamani',
  metodo: 'QR',
  estado: 'Habilitado',
};

describe('UT-HU11-02: tipos, schemas y helpers de ingresos', () => {
  it('1. formatHoraIngreso muestra la hora como HH:mm:ss', () => {
    expect(formatHoraIngreso('2026-09-06T09:04:32-04:00')).toBe('09:04:32');
  });

  it('2. formatHoraIngreso usa la hora de Bolivia sin importar la zona del texto', () => {
    expect(formatHoraIngreso('2026-09-06T13:04:32Z')).toBe('09:04:32');
  });

  it('3. formatHoraIngreso devuelve el mismo texto si no es una fecha válida', () => {
    expect(formatHoraIngreso('no-es-fecha')).toBe('no-es-fecha');
  });

  it('4. formatFechaExamen convierte yyyy-mm-dd en dd/mm/yyyy', () => {
    expect(formatFechaExamen('2026-09-06')).toBe('06/09/2026');
    expect(formatFechaExamen('fecha-rara')).toBe('fecha-rara');
  });

  it('5. labelExamen arma el texto del selector', () => {
    expect(
      labelExamen({ id: 1, nombre: 'Cálculo II – Examen Final', fecha: '2026-09-06' }),
    ).toBe('Cálculo II – Examen Final · 06/09/2026');
  });

  it('6. ingresoSchema acepta un ingreso válido', () => {
    expect(ingresoSchema.safeParse(ingresoValido).success).toBe(true);
  });

  it('7. ingresoSchema rechaza un método o un estado fuera de los permitidos', () => {
    expect(ingresoSchema.safeParse({ ...ingresoValido, metodo: 'Teclado' }).success).toBe(false);
    expect(ingresoSchema.safeParse({ ...ingresoValido, estado: 'Pendiente' }).success).toBe(false);
  });

  it('8. ingresoSchema rechaza un ingreso sin código SIS', () => {
    const { sis, ...sinSis } = ingresoValido;
    void sis;
    expect(ingresoSchema.safeParse(sinSis).success).toBe(false);
  });

  it('9. ingresosExamenSchema rechaza contadores negativos', () => {
    const base = { examenId: 1, ingresados: 42, total: 85, ingresos: [ingresoValido] };
    expect(ingresosExamenSchema.safeParse(base).success).toBe(true);
    expect(ingresosExamenSchema.safeParse({ ...base, ingresados: -1 }).success).toBe(false);
  });
});