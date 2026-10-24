import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamCard } from '../components/ExamCard';
import type { Examen } from '../types/qr-examen';

const baseExamen: Examen = {
  id: 101,
  carrera: 'Ingeniería de Sistemas',
  nombre: 'Cálculo II – Segundo Parcial',
  ambiente: 'Aula 691, Edificio MEMI',
  facultad: 'FCyT',
  fechaInicio: '2026-10-23T14:45:00Z',
  fechaFin: '2026-10-23T16:15:00Z',
  habilitado: true,
  estadoQr: 'DISPONIBLE',
  qrDisponibleDesde: '2026-10-22T14:45:00Z',
  qrVigenteHasta: '2026-10-23T16:15:00Z',
  qrGenerado: false,
};

describe('Bloque 2: ExamCard y sus 5 estados con borde superior', () => {
  it('1. Estado NO_DISPONIBLE_AUN: borde ámbar, botón deshabilitado y texto explicativo', () => {
    const examen: Examen = {
      ...baseExamen,
      estadoQr: 'NO_DISPONIBLE_AUN',
    };

    const { container } = render(<ExamCard examen={examen} />);

    // Borde superior ámbar
    const article = container.querySelector('article');
    expect(article).toHaveClass('border-t-4', 'border-t-amber-500');

    // Chip de estado
    expect(screen.getByTestId('chip-no-disponible')).toBeInTheDocument();
    expect(screen.getByText(/Disponible desde/i)).toBeInTheDocument();

    // Botón deshabilitado
    const boton = screen.getByRole('button', { name: /Generar QR del examen/i });
    expect(boton).toBeDisabled();

    // Texto de ayuda
    expect(
      screen.getByText(/El QR se habilita 24 horas antes del examen/i),
    ).toBeInTheDocument();
  });

  it('2. Estado DISPONIBLE: borde verde, chip Habilitado, botón azul activo y chip de horario', async () => {
    const onGenerarQr = jest.fn();
    const examen: Examen = {
      ...baseExamen,
      estadoQr: 'DISPONIBLE',
    };

    const { container } = render(
      <ExamCard examen={examen} onGenerarQr={onGenerarQr} />,
    );

    // Borde superior verde
    const article = container.querySelector('article');
    expect(article).toHaveClass('border-t-4', 'border-t-emerald-600');

    // Chip
    expect(screen.getByTestId('chip-habilitado')).toBeInTheDocument();
    expect(screen.getByText(/QR disponible hasta las/i)).toBeInTheDocument();

    // Botón activo y funcional
    const boton = screen.getByRole('button', { name: /Generar QR del examen/i });
    expect(boton).toBeEnabled();

    await userEvent.click(boton);
    expect(onGenerarQr).toHaveBeenCalledWith(examen);
  });

  it('3. Estado DISPONIBLE sin conexión (offline): botón desactivado con aviso de conexión', () => {
    const examen: Examen = {
      ...baseExamen,
      estadoQr: 'DISPONIBLE',
    };

    render(<ExamCard examen={examen} isOffline={true} />);

    const boton = screen.getByRole('button', {
      name: /Necesitas conexión para generar tu QR/i,
    });
    expect(boton).toBeDisabled();
  });

  it('4. Estado GENERADO: botón "Ver QR" y chip de vigencia', async () => {
    const onVerQr = jest.fn();
    const examen: Examen = {
      ...baseExamen,
      estadoQr: 'GENERADO',
      qrGenerado: true,
      token: 'token-abc-123',
    };

    const { container } = render(
      <ExamCard examen={examen} onVerQr={onVerQr} />,
    );

    // Borde verde
    const article = container.querySelector('article');
    expect(article).toHaveClass('border-t-4', 'border-t-emerald-600');

    expect(screen.getByTestId('chip-generado')).toBeInTheDocument();
    expect(screen.getByText(/Vigente hasta/i)).toBeInTheDocument();

    const boton = screen.getByRole('button', { name: /Ver QR/i });
    expect(boton).toBeEnabled();

    await userEvent.click(boton);
    expect(onVerQr).toHaveBeenCalledWith(examen);
  });

  it('5. Estado FINALIZADO: tarjeta atenuada, sin botón y texto de examen terminado', () => {
    const examen: Examen = {
      ...baseExamen,
      estadoQr: 'FINALIZADO',
    };

    const { container } = render(<ExamCard examen={examen} />);

    const article = container.querySelector('article');
    expect(article).toHaveClass('border-t-4', 'border-t-slate-400');

    expect(screen.getByTestId('chip-finalizado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Este examen terminó el .* Tu QR del examen ya no es válido/i),
    ).toBeInTheDocument();
  });

  it('6. Estado INHABILITADO: badge rojo Inhabilitado y sin botón de QR', () => {
    const examen: Examen = {
      ...baseExamen,
      habilitado: false,
      estadoQr: 'INHABILITADO',
    };

    const { container } = render(<ExamCard examen={examen} />);

    const article = container.querySelector('article');
    expect(article).toHaveClass('border-t-4', 'border-t-slate-400');

    expect(screen.getByTestId('chip-inhabilitado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(
      screen.getByText(/No habilitado para rendir esta evaluación/i),
    ).toBeInTheDocument();
  });
});

