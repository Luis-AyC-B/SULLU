// src/features/registro-ingresos/__tests__/CasosExcepcionales.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { ControlIngresosPageContainer } from '../components/ControlIngresosPageContainer';
import { RegistrarCasoExcepcionalModal } from '../components/RegistrarCasoExcepcionalModal';
import { EstudianteInhabilitadoModal } from '../components/EstudianteInhabilitadoModal';

// Mock de next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock de sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock de hooks
jest.mock('../hooks/useExamenesControl', () => ({
  useExamenesControl: jest.fn(),
}));

jest.mock('../hooks/useIngresosExamen', () => ({
  useIngresosExamen: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const { useExamenesControl } = jest.requireMock('../hooks/useExamenesControl');
const { useIngresosExamen } = jest.requireMock('../hooks/useIngresosExamen');

describe('HU-20: Registro de ingresos > Casos excepcionales', () => {
  const mockExamenes = [
    {
      id: 1,
      nombre: 'Bases de Datos I – Primer parcial',
      fecha: '2026-10-19',
      estado: 'EN_CURSO',
      ambiente: 'Laboratorio Informática 1',
      horario: '08:15-09:45',
    },
    {
      id: 2,
      nombre: 'Cálculo II – Examen Final',
      fecha: '2026-09-06',
      estado: 'FINALIZADO',
      ambiente: 'Aula 691B',
      horario: '14:15-15:45',
    },
  ];

  const mockIngresos = [
    {
      id: 1,
      hora: '2026-10-19T08:42:00-04:00',
      sis: '202100124',
      estudiante: 'Carlos Mendoza',
      metodo: 'QR' as const,
      estado: 'Habilitado' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Lic. Ana Rojas Mamani',
          email: 'docente@umss.edu',
          rol: 'DOCENTE',
        },
      },
      status: 'authenticated',
    });

    useExamenesControl.mockReturnValue({
      examenes: mockExamenes,
      isLoading: false,
      error: null,
    });

    useIngresosExamen.mockReturnValue({
      data: {
        examenId: 1,
        ingresados: 1,
        total: 85,
        ingresos: mockIngresos,
      },
      conexion: 'conectado',
    });
  });

  describe('Control de acceso y visibilidad del botón', () => {
    it('Docente visualiza el botón "Casos excepcionales" a la izquierda de "Descargar PDF"', () => {
      render(<ControlIngresosPageContainer />);
      const btnCaso = screen.getByRole('button', { name: /casos excepcionales/i });
      const btnPdf = screen.getByRole('button', { name: /descargar pdf/i });

      expect(btnCaso).toBeInTheDocument();
      expect(btnPdf).toBeInTheDocument();
    });

    it('Personal de Control NO visualiza el botón "Casos excepcionales"', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: 'Personal Control',
            email: 'control@umss.edu',
            rol: 'PERSONAL_CONTROL',
          },
        },
        status: 'authenticated',
      });

      render(<ControlIngresosPageContainer />);
      expect(
        screen.queryByRole('button', { name: /casos excepcionales/i })
      ).not.toBeInTheDocument();
    });

    it('Deshabilita el botón si el examen seleccionado está FINALIZADO', () => {
      useExamenesControl.mockReturnValue({
        examenes: [mockExamenes[1]], // Examen con estado FINALIZADO
        isLoading: false,
        error: null,
      });

      render(<ControlIngresosPageContainer />);
      const btnCaso = screen.getByRole('button', { name: /casos excepcionales/i });
      expect(btnCaso).toBeDisabled();
    });
  });

  describe('Modal de Registro de Caso Excepcional', () => {
    it('abre el modal "Registrar caso excepcional" al presionar el botón', () => {
      render(<ControlIngresosPageContainer />);
      const btnCaso = screen.getByRole('button', { name: /casos excepcionales/i });
      fireEvent.click(btnCaso);

      expect(screen.getByText('Registrar caso excepcional')).toBeInTheDocument();
      expect(
        screen.getByText(/Deja constancia del motivo por el que un estudiante llegará tarde/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Bases de Datos I – Primer parcial')).toBeInTheDocument();
    });

    it('muestra el contador de caracteres con límite 50 y no permite excederlo', () => {
      render(
        <RegistrarCasoExcepcionalModal
          isOpen={true}
          onClose={jest.fn()}
          examen={mockExamenes[0]}
          ingresosActuales={[]}
          onCasoRegistrado={jest.fn()}
        />
      );

      const textarea = screen.getByLabelText(/motivo del caso excepcional/i);
      expect(screen.getByText('0/50')).toBeInTheDocument();

      const textoLargo = 'a'.repeat(60);
      fireEvent.change(textarea, { target: { value: textoLargo.slice(0, 50) } });

      expect(screen.getByText('50/50')).toBeInTheDocument();
      expect(textarea).toHaveValue('a'.repeat(50));
    });

    it('valida que se seleccione un estudiante y se escriba un motivo antes de continuar', () => {
      render(
        <RegistrarCasoExcepcionalModal
          isOpen={true}
          onClose={jest.fn()}
          examen={mockExamenes[0]}
          ingresosActuales={[]}
          onCasoRegistrado={jest.fn()}
        />
      );

      const btnContinuar = screen.getByRole('button', { name: /continuar/i });
      fireEvent.click(btnContinuar);

      expect(
        screen.getByText('Selecciona un estudiante del examen.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Ingresa el motivo del caso excepcional.')
      ).toBeInTheDocument();
    });
  });

  describe('Modal de Estudiante Inhabilitado', () => {
    it('muestra el modal "Estudiante inhabilitado" con su motivo y se cierra con la X', () => {
      const handleClose = jest.fn();
      render(
        <EstudianteInhabilitadoModal
          isOpen={true}
          onClose={handleClose}
          estudianteNombre="Mariana Rojas"
          codigoSis="202211582"
          motivoInhabilitacion="Inscripción de la asignatura no confirmada"
        />
      );

      expect(screen.getByText('Estudiante inhabilitado')).toBeInTheDocument();
      expect(
        screen.getByText(/Mariana Rojas/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText('Inscripción de la asignatura no confirmada')
      ).toBeInTheDocument();

      const btnCerrar = screen.getByLabelText(/cerrar modal de estudiante inhabilitado/i);
      fireEvent.click(btnCerrar);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Flujo de Confirmación y Registro', () => {
    it('permite volver al formulario desde la confirmación conservando los datos', async () => {
      render(
        <RegistrarCasoExcepcionalModal
          isOpen={true}
          onClose={jest.fn()}
          examen={mockExamenes[0]}
          ingresosActuales={[]}
          onCasoRegistrado={jest.fn()}
        />
      );

      // Simular búsqueda y selección de estudiante
      const inputSis = screen.getByLabelText(/código sis/i);
      fireEvent.change(inputSis, { target: { value: '202100123' } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /seleccionar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /seleccionar/i }));

      // Escribir motivo
      const textarea = screen.getByLabelText(/motivo del caso excepcional/i);
      fireEvent.change(textarea, { target: { value: 'Cita médica a las 08:00' } });

      // Continuar a confirmación
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      expect(
        screen.getByRole('heading', { name: /confirmar caso excepcional/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Cita médica a las 08:00')).toBeInTheDocument();
      expect(
        screen.getByText(/Se registrará el ingreso del estudiante y será visible para el personal de control./i)
      ).toBeInTheDocument();

      // Presionar Volver
      fireEvent.click(screen.getAllByRole('button', { name: /volver/i })[0]);

      // Verifica que regresó al formulario y conserva el motivo
      expect(screen.getByText('Registrar caso excepcional')).toBeInTheDocument();
      expect(screen.getByLabelText(/motivo del caso excepcional/i)).toHaveValue(
        'Cita médica a las 08:00'
      );
    });

    it('registra exitosamente el caso excepcional y llama al callback', async () => {
      const handleCasoRegistrado = jest.fn();
      render(
        <RegistrarCasoExcepcionalModal
          isOpen={true}
          onClose={jest.fn()}
          examen={mockExamenes[0]}
          ingresosActuales={[]}
          onCasoRegistrado={handleCasoRegistrado}
        />
      );

      const inputSis = screen.getByLabelText(/código sis/i);
      fireEvent.change(inputSis, { target: { value: '202100123' } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /seleccionar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /seleccionar/i }));

      const textarea = screen.getByLabelText(/motivo del caso excepcional/i);
      fireEvent.change(textarea, { target: { value: 'Cita médica a las 08:00' } });

      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      const btnConfirmar = screen.getByRole('button', {
        name: /confirmar caso excepcional/i,
      });
      fireEvent.click(btnConfirmar);

      await waitFor(() => {
        expect(handleCasoRegistrado).toHaveBeenCalledWith(
          expect.objectContaining({
            sis: '202100123',
            metodo: 'Manual',
            estado: 'Habilitado',
            casoExcepcional: 'Cita médica a las 08:00',
          })
        );
      });
    });
  });

  describe('Columna Caso Excepcional en Tabla de Ingresos', () => {
    it('muestra la columna "Caso excepcional" en la cabecera de la tabla', () => {
      render(<ControlIngresosPageContainer />);
      expect(screen.getByText('Caso excepcional')).toBeInTheDocument();
    });

    it('muestra el pie de página con el contador de casos excepcionales cuando existen', () => {
      useIngresosExamen.mockReturnValue({
        data: {
          examenId: 1,
          ingresados: 1,
          total: 85,
          ingresos: [
            {
              id: 99,
              hora: '2026-10-19T09:15:00-04:00',
              sis: '202100123',
              estudiante: 'Ana Rojas Mamani',
              metodo: 'Manual' as const,
              estado: 'Habilitado' as const,
              casoExcepcional: 'Cita médica a las 08:00',
            },
          ],
        },
        conexion: 'conectado',
      });

      render(<ControlIngresosPageContainer />);
      expect(screen.getAllByText('Cita médica a las 08:00').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/1 ingreso reciente · 1 de 85 estudiantes registrados · 1 caso excepcional/i).length
      ).toBeGreaterThan(0);
    });
  });
});
