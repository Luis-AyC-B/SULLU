import { render, screen, within } from '@testing-library/react';
import { IngresosTable } from '../components/IngresosTable';
import type { Ingreso } from '../types/ingresos.types';

const ingresos: Ingreso[] = [
  { id: 2, hora: '2026-09-06T09:04:32-04:00', sis: '201900123', estudiante: 'Ana Rojas Mamani', metodo: 'QR', estado: 'Habilitado' },
  { id: 1, hora: '2026-09-06T09:03:21-04:00', sis: '201902345', estudiante: 'Valeria López Quispe', metodo: 'Manual', estado: 'Habilitado' },
];

type Props = Partial<React.ComponentProps<typeof IngresosTable>>;
const montar = (props: Props = {}) =>
  render(
    <IngresosTable ingresos={ingresos} isLoading={false} ingresados={42} total={85} {...props} />,
  );

describe('UT-HU11-06: IngresosTable (tabla y tarjetas)', () => {
  it('1. muestra los encabezados de la tabla', () => {
    montar();
    const tabla = screen.getByRole('table');
    ['Hora', 'Código SIS', 'Estudiante', 'Método', 'Estado'].forEach((nombre) => {
      expect(within(tabla).getByRole('columnheader', { name: nombre })).toBeInTheDocument();
    });
  });

  it('2. muestra una fila por ingreso con hora, SIS, nombre, método y estado', () => {
    montar();
    const tabla = screen.getByRole('table');

    expect(within(tabla).getAllByRole('row')).toHaveLength(3); // encabezado + 2 ingresos
    expect(within(tabla).getByText('09:04:32')).toBeInTheDocument();
    expect(within(tabla).getByText('201900123')).toBeInTheDocument();
    expect(within(tabla).getByText('Ana Rojas Mamani')).toBeInTheDocument();
    expect(within(tabla).getByText('Manual')).toBeInTheDocument();
    expect(within(tabla).getAllByText('Habilitado')).toHaveLength(2);
  });

  it('3. muestra también una tarjeta por ingreso para móvil', () => {
    montar();
    expect(screen.getByText('Código SIS: 201900123')).toBeInTheDocument();
    expect(screen.getByText('Código SIS: 201902345')).toBeInTheDocument();
  });

  it('4. el pie indica los ingresos mostrados y el total de registrados', () => {
    montar();
    expect(
      screen.getAllByText('2 ingresos recientes · 42 de 85 estudiantes registrados'),
    ).toHaveLength(2); // tabla + vista móvil
  });

  it('5. el pie usa el singular cuando hay un solo ingreso', () => {
    montar({ ingresos: [ingresos[0]] });
    expect(
      screen.getAllByText('1 ingreso reciente · 42 de 85 estudiantes registrados'),
    ).toHaveLength(2);
  });

  it('6. mientras carga no muestra ingresos ni pie', () => {
    montar({ isLoading: true });
    expect(screen.queryByText('Ana Rojas Mamani')).not.toBeInTheDocument();
    expect(screen.queryByText(/estudiantes registrados/)).not.toBeInTheDocument();
  });

  it('7. sin ingresos y sin búsqueda muestra el mensaje de lista vacía', () => {
    montar({ ingresos: [] });
    expect(
      screen.getAllByText('Aún no hay ingresos registrados en este examen.'),
    ).toHaveLength(2);
  });

  it('8. sin coincidencias de búsqueda muestra el mensaje de sin resultados', () => {
    montar({ ingresos: [], hayBusqueda: true });
    expect(
      screen.getAllByText('No se encontraron ingresos para tu búsqueda.'),
    ).toHaveLength(2);
  });

  it('9. resalta solo el ingreso más reciente cuando no hay búsqueda', () => {
    montar();
    const filas = within(screen.getByRole('table')).getAllByRole('row');
    expect(filas[1].className).toContain('bg-success/5');
    expect(filas[2].className).not.toContain('bg-success/5');
  });

  it('10. no resalta ninguna fila cuando hay una búsqueda activa', () => {
    montar({ hayBusqueda: true });
    const filas = within(screen.getByRole('table')).getAllByRole('row');
    expect(filas[1].className).not.toContain('bg-success/5');
  });
});