import { render, screen } from '@testing-library/react';
import { ExamCard } from '../components/ExamCard';
import type { ExamenEstudiante } from '../types/student-exam.types';

const examen: ExamenEstudiante = {
  id: 1,
  carrera: 'Ingeniería de Sistemas',
  nombre: 'Cálculo II – Examen Final',
  ambiente: 'Aula 203',
  facultad: 'FCyT',
  fecha: '2026-09-06',
  horaInicio: '09:00',
  horaFin: '11:00',
  estado: 'Habilitado',
};

describe('UT-PE-02: ExamCard muestra la información de un examen', () => {
  it('1. muestra carrera, nombre, ambiente con facultad, fecha, hora y estado "Habilitado"', () => {
    render(<ExamCard examen={examen} />);

    expect(screen.getByText('Ingeniería de Sistemas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cálculo II – Examen Final' })).toBeInTheDocument();
    expect(screen.getByText('Aula 203 (FCyT)')).toBeInTheDocument();
    expect(screen.getByText('06/09/2026')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 11:00')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
  });

  it('2. convierte la fecha ISO al formato dd/mm/aaaa', () => {
    render(<ExamCard examen={{ ...examen, fecha: '2026-09-14' }} />);
    expect(screen.getByText('14/09/2026')).toBeInTheDocument();
  });

  it('3. el estado "Habilitado" se muestra con el estilo de éxito (verde)', () => {
    render(<ExamCard examen={examen} />);
    expect(screen.getByText('Habilitado')).toHaveClass('text-success');
  });

  it('4. un examen "Inhabilitado" muestra su estado con el estilo de error', () => {
    render(<ExamCard examen={{ ...examen, estado: 'Inhabilitado' }} />);
    expect(screen.getByText('Inhabilitado')).toHaveClass('text-destructive');
    expect(screen.queryByText('Habilitado')).not.toBeInTheDocument();
  });
});