// src/features/registro-ingresos/__tests__/DescargarReportePdf.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ControlIngresosPageContainer } from '../components/ControlIngresosPageContainer';
import {
  formatearNombreArchivoReporte,
  obtenerNombreMateria,
  obtenerNombreParcial,
  toPascalCase,
  generarPdfReporteIngresos,
} from '../lib/generarPdfReporteIngresos';

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

// Mock del servicio de ingresos
const mockDescargarReporteIngresosPdf = jest.fn();
jest.mock('../api/ingresos.service', () => ({
  ...jest.requireActual('../api/ingresos.service'),
  descargarReporteIngresosPdf: (...args: unknown[]) => mockDescargarReporteIngresosPdf(...args),
}));

const mockUseSession = useSession as jest.Mock;
const { useExamenesControl } = jest.requireMock('../hooks/useExamenesControl');
const { useIngresosExamen } = jest.requireMock('../hooks/useIngresosExamen');

describe('HU-17: Registro de ingresos > Descargar reporte de asistencia', () => {
  const mockExamenes = [
    { id: 1, nombre: 'Bases de Datos I – Primer parcial', fecha: '2026-10-19' },
    { id: 2, nombre: 'Cálculo II – Examen Final', fecha: '2026-09-06' },
  ];

  const mockIngresosData = {
    examenId: 1,
    ingresados: 38,
    total: 85,
    ingresos: [
      {
        id: 1,
        hora: '2026-10-19T08:42:00-04:00',
        sis: '202100123',
        estudiante: 'Ana Rojas Mamani',
        metodo: 'QR' as const,
        estado: 'Habilitado' as const,
      },
      {
        id: 2,
        hora: '2026-10-19T08:45:00-04:00',
        sis: '202100124',
        estudiante: 'Carlos Mendoza',
        metodo: 'Manual' as const,
        estado: 'Habilitado' as const,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Sesión por defecto como Docente
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Lic. Docente Test',
          email: 'docente@umss.edu',
          rol: 'DOCENTE',
        },
      },
      status: 'authenticated',
    });

    useExamenesControl.mockReturnValue({
      examenes: mockExamenes,
      isLoading: false,
      error: false,
    });

    useIngresosExamen.mockReturnValue({
      data: mockIngresosData,
      conexion: 'conectado',
    });

    // Mock URL.createObjectURL y revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('Criterio 23: Nomenclatura del archivo PDF', () => {
    it('convierte cadenas a PascalCase eliminando acentos', () => {
      expect(toPascalCase('Bases de Datos I')).toBe('BasesDeDatosI');
      expect(toPascalCase('Primer parcial')).toBe('PrimerParcial');
      expect(toPascalCase('Cálculo II')).toBe('CalculoII');
    });

    it('genera el nombre del archivo con formato ingresos_[Materia]_[Examen]_[Fecha].pdf', () => {
      const nombre = formatearNombreArchivoReporte(
        'Bases de Datos I – Primer parcial',
        '2026-10-19'
      );
      expect(nombre).toBe('ingresos_BasesDeDatosI_PrimerParcial_19-10-2026.pdf');
    });

    it('extrae correctamente el nombre de la materia y el parcial', () => {
      expect(obtenerNombreMateria('Bases de Datos I – Primer parcial')).toBe('Bases de Datos I');
      expect(obtenerNombreParcial('Bases de Datos I – Primer parcial')).toBe('Primer parcial');
    });
  });

  describe('Criterio 13: Control de acceso por rol', () => {
    it('muestra el botón "Descargar PDF" cuando el usuario es Docente', () => {
      render(<ControlIngresosPageContainer />);
      expect(screen.getByRole('button', { name: /descargar pdf/i })).toBeInTheDocument();
    });

    it('NO muestra el botón "Descargar PDF" cuando el usuario tiene otro rol (ej. CONTROL)', () => {
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
      expect(screen.queryByRole('button', { name: /descargar pdf/i })).not.toBeInTheDocument();
    });
  });

  describe('Criterio 1 y 2: Visualización y estado del botón', () => {
    it('muestra el botón habilitado cuando hay un examen seleccionado con ingresos', () => {
      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('el botón aparece deshabilitado con mensaje cuando no hay examen', () => {
      useExamenesControl.mockReturnValue({
        examenes: [],
        isLoading: false,
        error: false,
      });
      useIngresosExamen.mockReturnValue({
        data: null,
        conexion: 'conectado',
      });

      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      expect(btn).toBeDisabled();
      expect(btn.parentElement).toHaveAttribute(
        'title',
        'Selecciona un examen para descargar el reporte'
      );
    });
  });

  describe('Criterio 8: Examen sin ingresos registrados', () => {
    it('muestra advertencia y no abre modal cuando el examen tiene 0 ingresos', () => {
      useIngresosExamen.mockReturnValue({
        data: {
          examenId: 1,
          ingresados: 0,
          total: 85,
          ingresos: [],
        },
        conexion: 'conectado',
      });

      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(toast.warning).toHaveBeenCalledWith('No hay ingresos registrados para descargar');
      expect(screen.queryByText(/confirmar descarga/i)).not.toBeInTheDocument();
    });
  });

  describe('Criterio 10: Validación de conectividad', () => {
    it('muestra mensaje si no hay conexión y no abre modal', () => {
      useIngresosExamen.mockReturnValue({
        data: mockIngresosData,
        conexion: 'desconectado',
      });

      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(toast.error).toHaveBeenCalledWith('Necesitas conexión para descargar el reporte');
      expect(screen.queryByText(/confirmar descarga/i)).not.toBeInTheDocument();
    });
  });

  describe('Criterios 3, 4, 11: Modal de confirmación', () => {
    it('abre el modal "Confirmar descarga" con la materia y el aviso de sincronización', () => {
      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(screen.getByText('Confirmar descarga')).toBeInTheDocument();
      expect(
        screen.getByText(/¿Desea descargar el reporte de asistencia de la materia/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Bases de Datos I')).toBeInTheDocument();
      expect(
        screen.getByText(/El reporte incluye los ingresos sincronizados hasta este momento/i)
      ).toBeInTheDocument();
    });

    it('cierra el modal sin descargar nada al presionar "Cancelar"', () => {
      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(screen.getByText('Confirmar descarga')).toBeInTheDocument();
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText('Confirmar descarga')).not.toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Criterios 5, 6, 12: Flujo de descarga exitosa', () => {
    it('descarga el archivo y muestra "Reporte descargado"', async () => {
      const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      mockDescargarReporteIngresosPdf.mockResolvedValueOnce({
        blob: mockBlob,
        filename: 'ingresos_BasesDeDatosI_PrimerParcial_19-10-2026.pdf',
      });

      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Reporte descargado');
      });

      expect(screen.queryByText('Confirmar descarga')).not.toBeInTheDocument();
    });
  });

  describe('Criterio 9: Manejo de errores con opción de reintentar', () => {
    it('muestra mensaje de error y botón de reintento si la descarga falla', async () => {
      mockDescargarReporteIngresosPdf.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<ControlIngresosPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Ocurrió un error al generar el reporte de asistencia/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });

  describe('Generación binaria de PDF', () => {
    it('genera un Blob de tipo application/pdf con encabezados válidos', () => {
      const blob = generarPdfReporteIngresos({
        examen: mockExamenes[0],
        ingresos: mockIngresosData.ingresos,
        ingresados: mockIngresosData.ingresados,
        total: mockIngresosData.total,
        docenteNombre: 'Lic. Docente Test',
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(100);
    });
  });
});
