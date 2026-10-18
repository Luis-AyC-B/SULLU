import { filtrarIngresos } from '../lib/filtrarIngresos';
import type { Ingreso } from '../types/ingresos.types';

const ingresos: Ingreso[] = [
  { id: 6, hora: '2026-09-06T09:04:32-04:00', sis: '201900123', estudiante: 'Ana Rojas Mamani', metodo: 'QR', estado: 'Habilitado' },
  { id: 5, hora: '2026-09-06T09:03:57-04:00', sis: '202001456', estudiante: 'Diego Flores Vargas', metodo: 'QR', estado: 'Habilitado' },
  { id: 4, hora: '2026-09-06T09:03:21-04:00', sis: '201902345', estudiante: 'Valeria López Quispe', metodo: 'Manual', estado: 'Habilitado' },
];

const nombres = (lista: Ingreso[]) => lista.map((i) => i.estudiante);

describe('UT-HU11-01: filtrarIngresos', () => {
  it('1. sin texto devuelve todos los ingresos', () => {
    expect(filtrarIngresos(ingresos, '')).toHaveLength(3);
  });

  it('2. un texto con solo espacios devuelve todos los ingresos', () => {
    expect(filtrarIngresos(ingresos, '   ')).toHaveLength(3);
  });

  it('3. filtra por código SIS completo', () => {
    expect(nombres(filtrarIngresos(ingresos, '201900123'))).toEqual(['Ana Rojas Mamani']);
  });

  it('4. filtra por SIS parcial', () => {
    expect(nombres(filtrarIngresos(ingresos, '2019'))).toEqual([
      'Ana Rojas Mamani',
      'Valeria López Quispe',
    ]);
  });

  it('5. el nombre se busca sin distinguir mayúsculas ni tildes', () => {
    expect(nombres(filtrarIngresos(ingresos, 'lopez'))).toEqual(['Valeria López Quispe']);
    expect(nombres(filtrarIngresos(ingresos, 'ANA ROJAS'))).toEqual(['Ana Rojas Mamani']);
  });

  it('6. sin coincidencias devuelve una lista vacía', () => {
    expect(filtrarIngresos(ingresos, 'zzzz')).toEqual([]);
  });

  it('7. no modifica la lista original', () => {
    filtrarIngresos(ingresos, 'ana');
    expect(ingresos).toHaveLength(3);
  });
});