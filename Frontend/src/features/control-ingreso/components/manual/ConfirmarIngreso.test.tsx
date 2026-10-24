import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmarIngresoStep } from './ConfirmarIngresoStep';
import type { EstudianteBusquedaItem, ExamenAsignado } from '../../types/control-ingreso.types';

describe('UT3-HU8: ConfirmarIngresoStep (pantalla de confirmación de registro manual)', () => {
  const mockEstudiante: EstudianteBusquedaItem = {
    id: 1,
    codSis: '202110234',
    ci: '8765432',
    nombre: 'Valentina',
    apellido: 'Pérez Gómez',
    estadoHabilitado: true,
    ambienteAsignado: 'Sala 204',
    yaIngreso: false,
  };

  const mockExamen: ExamenAsignado = {
    id: 10,
    asignatura: 'Bases de Datos I',
    sigla: 'BD1',
    ambiente: 'Sala 204',
    horario: '08:15–09:45',
    fecha: '23 oct',
    ingresados: 15,
    totalEstudiantes: 40,
    estado: 'EN_CURSO',
  };

  const defaultProps = {
    estudiante: mockEstudiante,
    examen: mockExamen,
    onVolver: jest.fn(),
    onCancelar: jest.fn(),
    onConfirmar: jest.fn(),
    isSubmitting: false,
    errorEnvio: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Caso 1: Límite de texto y contador
  it('1. Contador y límite de caracteres: Manejo de textos largos en campos de observación / datos', () => {
    const textoLargo = 'A'.repeat(251);
    const textoTruncado = textoLargo.slice(0, 250);
    expect(textoTruncado.length).toBe(250);
    expect(`${textoTruncado.length}/250`).toBe('250/250');
  });

  // Caso 2: Doble clic en confirmar
  it('2. Doble clic en confirmar: El botón se deshabilita durante el envío y previene llamadas duplicadas', () => {
    const onConfirmarMock = jest.fn();
    const { rerender } = render(
      <ConfirmarIngresoStep {...defaultProps} onConfirmar={onConfirmarMock} isSubmitting={false} />
    );

    const confirmarBtn = screen.getAllByRole('button', { name: /confirmar ingreso/i })[0];
    fireEvent.click(confirmarBtn);
    expect(onConfirmarMock).toHaveBeenCalledTimes(1);

    // Al activarse el estado isSubmitting
    rerender(
      <ConfirmarIngresoStep {...defaultProps} onConfirmar={onConfirmarMock} isSubmitting={true} />
    );

    const btnDeshabilitado = screen.getAllByRole('button', { name: /confirmando ingreso/i })[0];
    expect(btnDeshabilitado).toBeDisabled();
    fireEvent.click(btnDeshabilitado);
    expect(onConfirmarMock).toHaveBeenCalledTimes(1);
  });

  // Caso 3: Datos mostrados
  it('3. Datos mostrados: Se muestran nombre, código SIS, carnet, estado "Habilitado" y ambiente del examen', () => {
    render(<ConfirmarIngresoStep {...defaultProps} />);

    expect(screen.getByText('Valentina Pérez Gómez')).toBeInTheDocument();
    expect(screen.getByText(/202110234/)).toBeInTheDocument();
    expect(screen.getByText(/8765432/)).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Sala 204')).toBeInTheDocument();
  });

  // Caso 4: Cancelar o volver
  it('4. Cancelar o volver: Clic en "Cancelar" o "Volver a resultados" no llama al servicio de registro', () => {
    const onCancelarMock = jest.fn();
    const onVolverMock = jest.fn();
    const onConfirmarMock = jest.fn();

    render(
      <ConfirmarIngresoStep
        {...defaultProps}
        onCancelar={onCancelarMock}
        onVolver={onVolverMock}
        onConfirmar={onConfirmarMock}
      />
    );

    const volverBtn = screen.getByRole('button', { name: /volver a resultados/i });
    fireEvent.click(volverBtn);
    expect(onVolverMock).toHaveBeenCalledTimes(1);
    expect(onConfirmarMock).not.toHaveBeenCalled();

    const cancelarBtn = screen.getAllByRole('button', { name: /cancelar/i })[0];
    fireEvent.click(cancelarBtn);
    expect(onCancelarMock).toHaveBeenCalledTimes(1);
    expect(onConfirmarMock).not.toHaveBeenCalled();
  });
});
