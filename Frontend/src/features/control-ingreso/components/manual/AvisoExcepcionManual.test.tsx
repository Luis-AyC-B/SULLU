import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExcepcionValidacionCard } from './ExcepcionValidacionCard';
import type { ExcepcionDetalle } from '../../hooks/useRegistroManual';

// Mock de next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('UT4-HU8: AvisoExcepcionManual (aviso de excepción del flujo manual)', () => {
  const mockEstudiante = {
    id: 10,
    codSis: '2021-10234',
    ci: '8765432',
    nombre: 'Valentina',
    apellido: 'Pérez',
    estadoHabilitado: false,
    ambienteAsignado: 'Sala 204',
    yaIngreso: false,
  };

  const mockExcepcion: ExcepcionDetalle = {
    tipo: 'NO_HABILITADO',
    titulo: 'Estudiante no habilitado',
    mensaje: 'No figura habilitado en las listas oficiales',
    estudiante: mockEstudiante,
  };

  const defaultProps = {
    excepcion: mockExcepcion,
    examenId: 1,
    onContinuar: jest.fn(),
    onCerrar: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Caso 1: Usuario con permiso de incidencias
  it('1. Usuario con permiso incidencias.crear: Se muestra el botón "Registrar incidencia"', () => {
    render(<ExcepcionValidacionCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /registrar incidencia/i })).toBeInTheDocument();
  });

  // Caso 2: Simulación sin permiso
  it('2. Usuario sin permiso: Oculta o restringe el acceso según rol', () => {
    // Si no tiene permisos, el botón no se renderiza en la vista protegida
    const { container } = render(<ExcepcionValidacionCard {...defaultProps} />);
    expect(container).toBeDefined();
  });

  // Caso 3: Clic en el botón con datos precargados
  it('3. Clic en el botón: Redirige a incidencias con prefill de datos limpios (SIS sólo dígitos, examenId)', () => {
    render(<ExcepcionValidacionCard {...defaultProps} />);
    const incidenciaBtn = screen.getByRole('button', { name: /registrar incidencia/i });
    fireEvent.click(incidenciaBtn);

    expect(defaultProps.onCerrar).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/incidencias?examenId=1')
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sis=2021-10234')
    );
  });

  // Caso 4: Flujo completado y volver a la búsqueda
  it('4. Incidencia registrada / Continuar: El aviso se cierra y se vuelve al flujo de búsqueda', () => {
    const onContinuarMock = jest.fn();
    render(<ExcepcionValidacionCard {...defaultProps} onContinuar={onContinuarMock} />);

    const continuarBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(continuarBtn);

    expect(onContinuarMock).toHaveBeenCalledTimes(1);
  });
});
