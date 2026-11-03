// src/features/incidencias/__tests__/ReporteObservacionesPdf.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { IncidenciasPageContainer } from '../components/IncidenciasPageContainer';
import {
  formatearNombreArchivoObservaciones,
  obtenerNombreMateriaIncidencia,
  obtenerNombreParcialIncidencia,
  generarPdfReporteObservaciones,
} from '../lib/generarPdfReporteObservaciones';
import { filtrarIncidenciasPorMotivo } from '../types/incidencias.types';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

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
jest.mock('../hooks/useExamenesIncidencias', () => ({
  useExamenesIncidencias: jest.fn(),
}));

jest.mock('../hooks/useIncidenciasExamen', () => ({
  useIncidenciasExamen: jest.fn(),
}));

jest.mock('../hooks/usePuedeRegistrarIncidencia', () => ({
  usePuedeRegistrarIncidencia: jest.fn(),
}));

// Mock del servicio de incidencias
const mockDescargarReporteObservacionesPdf = jest.fn();
jest.mock('../api/incidencias.service', () => ({
  ...jest.requireActual('../api/incidencias.service'),
  descargarReporteObservacionesPdf: (...args: unknown[]) =>
    mockDescargarReporteObservacionesPdf(...args),
}));

const mockUseSession = useSession as jest.Mock;
const { useExamenesIncidencias } = jest.requireMock('../hooks/useExamenesIncidencias');
const { useIncidenciasExamen } = jest.requireMock('../hooks/useIncidenciasExamen');
const { usePuedeRegistrarIncidencia } = jest.requireMock(
  '../hooks/usePuedeRegistrarIncidencia'
);

describe('HU-18: Reporte De Observaciones De Ingreso', () => {
  const mockExamenes = [
    { id: '1', nombre: 'Bases de Datos I – Primer parcial', fecha: '2026-10-19' },
    { id: '2', nombre: 'Cálculo II – Examen Final', fecha: '2026-09-06' },
  ];

  const mockIncidencias = [
    {
      id: '1',
      examenId: '1',
      fechaHora: '2026-10-19T09:03:44-04:00',
      codigoSis: '202104321',
      estudianteNombre: 'Sofía Aguilar Céspedes',
      motivo: 'NO_HABILITADO',
      observaciones: null,
      registradoPor: 'Carlos Mendoza',
    },
    {
      id: '2',
      examenId: '1',
      fechaHora: '2026-10-19T09:02:15-04:00',
      codigoSis: '202003456',
      estudianteNombre: 'Andrés Villarroel Rocha',
      motivo: 'DOBLE_MARCACION',
      observaciones: null,
      registradoPor: 'Carlos Mendoza',
    },
    {
      id: '3',
      examenId: '1',
      fechaHora: '2026-10-19T09:00:52-04:00',
      codigoSis: '201905678',
      estudianteNombre: 'Camila Méndez García',
      motivo: 'QR_NO_VALIDO',
      observaciones: null,
      registradoPor: 'Carlos Mendoza',
    },
    {
      id: '4',
      examenId: '1',
      fechaHora: '2026-10-19T08:59:18-04:00',
      codigoSis: '202102345',
      estudianteNombre: 'Joaquín Torrico Rojas',
      motivo: 'NO_HABILITADO',
      observaciones: null,
      registradoPor: 'Carlos Mendoza',
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

    useExamenesIncidencias.mockReturnValue({
      examenes: mockExamenes,
      isLoading: false,
      error: null,
      reintentar: jest.fn(),
    });

    useIncidenciasExamen.mockReturnValue({
      incidencias: mockIncidencias,
      isLoading: false,
      error: null,
      recargar: jest.fn(),
    });

    usePuedeRegistrarIncidencia.mockReturnValue(false);

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-pdf-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('Nomenclatura y helpers del reporte', () => {
    it('genera el nombre del archivo con formato observaciones_[Materia]_[Examen]_[Fecha].pdf', () => {
      const nombre = formatearNombreArchivoObservaciones(
        'Bases de Datos I – Primer parcial',
        '2026-10-19'
      );
      expect(nombre).toBe('observaciones_BasesDeDatosI_PrimerParcial_19-10-2026.pdf');
    });

    it('extrae el nombre de la materia y el parcial correctamente', () => {
      expect(obtenerNombreMateriaIncidencia('Bases de Datos I – Primer parcial')).toBe(
        'Bases de Datos I'
      );
      expect(obtenerNombreParcialIncidencia('Bases de Datos I – Primer parcial')).toBe(
        'Primer parcial'
      );
    });

    it('filtra correctamente las incidencias por motivo', () => {
      const todos = filtrarIncidenciasPorMotivo(mockIncidencias, 'TODOS');
      expect(todos.length).toBe(4);

      const noHabilitados = filtrarIncidenciasPorMotivo(mockIncidencias, 'NO_HABILITADO');
      expect(noHabilitados.length).toBe(2);

      const dobleMarcacion = filtrarIncidenciasPorMotivo(mockIncidencias, 'DOBLE_MARCACION');
      expect(dobleMarcacion.length).toBe(1);
      expect(dobleMarcacion[0].codigoSis).toBe('202003456');
    });
  });

  describe('Control de acceso y vistas por Rol', () => {
    it('Docente visualiza el botón "Descargar PDF" y NO visualiza "+ Registrar incidencia"', () => {
      render(<IncidenciasPageContainer />);
      expect(screen.getByRole('button', { name: /descargar pdf/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /\+ registrar incidencia/i })
      ).not.toBeInTheDocument();
    });

    it('Personal de Control visualiza "+ Registrar incidencia" y NO visualiza "Descargar PDF"', () => {
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
      usePuedeRegistrarIncidencia.mockReturnValue(true);

      render(<IncidenciasPageContainer />);
      expect(
        screen.getByRole('button', { name: /\+ registrar incidencia/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /descargar pdf/i })).not.toBeInTheDocument();
    });
  });

  describe('Filtros combinables y contador', () => {
    it('muestra los selectores de Materia y Motivo en la barra de herramientas', () => {
      render(<IncidenciasPageContainer />);
      expect(screen.getByRole('combobox', { name: /materia/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /motivo/i })).toBeInTheDocument();
    });

    it('muestra el contador inicial con todas las incidencias registradas', () => {
      render(<IncidenciasPageContainer />);
      expect(
        screen.getAllByText('4 incidencias registradas para este examen').length
      ).toBeGreaterThan(0);
    });
  });

  describe('Modal de confirmación de descarga para Docente', () => {
    it('abre el modal "Confirmar descarga" con el nombre de la materia', () => {
      render(<IncidenciasPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(screen.getByText('Confirmar descarga')).toBeInTheDocument();
      expect(
        screen.getByText(/¿Desea descargar las observaciones de ingreso de/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Bases de Datos I')).toBeInTheDocument();
    });

    it('cierra el modal sin descargar nada al presionar "Cancelar"', () => {
      render(<IncidenciasPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText('Confirmar descarga')).not.toBeInTheDocument();
      expect(mockDescargarReporteObservacionesPdf).not.toHaveBeenCalled();
    });

    it('advierte y no abre modal si la materia no tiene observaciones', () => {
      useIncidenciasExamen.mockReturnValue({
        incidencias: [],
        isLoading: false,
        error: null,
        recargar: jest.fn(),
      });

      render(<IncidenciasPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      expect(toast.warning).toHaveBeenCalledWith(
        'No hay observaciones registradas para descargar'
      );
      expect(screen.queryByText('Confirmar descarga')).not.toBeInTheDocument();
    });
  });

  describe('Flujo de descarga y manejo de errores', () => {
    it('descarga exitosamente el PDF y notifica "Reporte descargado"', async () => {
      const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      mockDescargarReporteObservacionesPdf.mockResolvedValueOnce({
        blob: mockBlob,
        filename: 'observaciones_BasesDeDatosI_PrimerParcial_19-10-2026.pdf',
      });

      render(<IncidenciasPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Reporte descargado');
      });

      expect(screen.queryByText('Confirmar descarga')).not.toBeInTheDocument();
    });

    it('muestra mensaje de error y botón "Reintentar" si la descarga falla', async () => {
      mockDescargarReporteObservacionesPdf.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<IncidenciasPageContainer />);
      const btn = screen.getByRole('button', { name: /descargar pdf/i });
      fireEvent.click(btn);

      const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Ocurrió un error al generar el reporte de observaciones/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });

  describe('Generador de PDF de observaciones', () => {
    it('genera un Blob de tipo application/pdf con los metadatos y tabla de observaciones', () => {
      const blob = generarPdfReporteObservaciones({
        examen: mockExamenes[0],
        incidencias: mockIncidencias,
        filtroMotivo: 'TODOS',
        generadoPor: 'Lic. Ana Rojas Mamani',
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(100);
    });
  });
});
