import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicExamQrView } from '../components/PublicExamQrView';
import * as examQrServiceModule from '../api/exam-qr.service';
import type { ResultadoValidacionQr } from '../types/qr-examen';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('../api/exam-qr.service', () => ({
  getExamQrService: jest.fn(),
}));

describe('Bloque 4: PublicExamQrView (Vista pública QR y motivos de rechazo)', () => {
  const mockValidarTokenQr = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const mockService = {
      getExamenes: jest.fn(),
      generarQrExamen: jest.fn(),
      validarTokenQr: mockValidarTokenQr,
    };
    (examQrServiceModule.getExamQrService as unknown as jest.Mock).mockResolvedValue(mockService);
  });

  it('1. QR Válido: muestra sello verde, datos del estudiante y examen sin filtrar CI ni teléfono', async () => {
    const mockResultado: ResultadoValidacionQr = {
      esValido: true,
      estudiante: {
        nombre: 'CAROLINA MÉNDEZ VARGAS',
        sis: '202100456',
        carrera: 'Ingeniería Informática',
        fotoUrl: null,
      },
      examen: {
        id: 201,
        nombre: 'Examen Final - Algoritmos Avanzados',
        ambiente: 'Laboratorio de Cómputo 3',
        fecha: '2026-10-25T14:00:00Z',
        horaInicio: '14:00',
        horaFin: '16:00',
        docente: 'Lic. Roberto Gómez',
      },
      vigenteHasta: '2026-10-25T16:00:00Z',
    };

    mockValidarTokenQr.mockResolvedValueOnce(mockResultado);

    render(<PublicExamQrView token="token-valido-123" />);

    await waitFor(() => {
      expect(screen.getByText(/QR VÁLIDO/i)).toBeInTheDocument();
    });

    expect(screen.getByText('CAROLINA MÉNDEZ VARGAS')).toBeInTheDocument();
    expect(screen.getByText(/SIS: 202100456/i)).toBeInTheDocument();
    expect(screen.getByText('Ingeniería Informática')).toBeInTheDocument();
    expect(screen.getByText('Examen Final - Algoritmos Avanzados')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio de Cómputo 3')).toBeInTheDocument();

    // Verificación de privacidad: NO debe haber CI, teléfono ni correo
    expect(screen.queryByText(/CI:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Teléfono/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/@est\.umss\.edu\.bo/i)).not.toBeInTheDocument();
  });

  it('2. Rechazo "Este código venció": muestra icono de reloj y aviso sin datos personales', async () => {
    mockValidarTokenQr.mockResolvedValueOnce({
      esValido: false,
      motivoRechazo: 'VENCIDO',
      mensaje: 'El código QR ha expirado porque el examen ya finalizó o superó el tiempo límite de vigencia.',
    });

    render(<PublicExamQrView token="token-vencido-456" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Este código venció/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/El código QR ha expirado porque el examen ya finalizó/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Si necesitas ingresar al aula, consulta con el docente/i),
    ).toBeInTheDocument();

    // Ningún dato personal expuesto
    expect(screen.queryByText(/SIS:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/QR VÁLIDO/i)).not.toBeInTheDocument();
  });

  it('3. Rechazo "Este código fue revocado": muestra aviso de revocación sin datos personales', async () => {
    mockValidarTokenQr.mockResolvedValueOnce({
      esValido: false,
      motivoRechazo: 'REVOCADO',
      mensaje: 'Este código QR fue invalidado porque se generó uno nuevo o cambiaron las credenciales de seguridad del estudiante.',
    });

    render(<PublicExamQrView token="token-revocado-789" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Este código fue revocado/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Este código QR fue invalidado porque se generó uno nuevo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Genera un nuevo código QR desde el Portal Estudiante/i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/SIS:/i)).not.toBeInTheDocument();
  });

  it('4. Rechazo "Código no válido": muestra aviso de token inválido o manipulado', async () => {
    mockValidarTokenQr.mockResolvedValueOnce({
      esValido: false,
      motivoRechazo: 'INVALIDO',
      mensaje: 'El código QR no corresponde a un examen registrado o la firma digital no es válida.',
    });

    render(<PublicExamQrView token="token-invalido-000" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Código no válido/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/El código QR no corresponde a un examen registrado/i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/SIS:/i)).not.toBeInTheDocument();
  });

  it('5. Error de conexión: muestra mensaje y permite reintentar', async () => {
    mockValidarTokenQr.mockRejectedValueOnce(new Error('Network error'));

    render(<PublicExamQrView token="token-error" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Error de conexión/i }),
      ).toBeInTheDocument();
    });

    mockValidarTokenQr.mockResolvedValueOnce({
      esValido: true,
      estudiante: { nombre: 'REINTENTO EXITOSO', sis: '202099999' },
    });

    await userEvent.click(screen.getByRole('button', { name: /Reintentar verificación/i }));

    await waitFor(() => {
      expect(screen.getByText('REINTENTO EXITOSO')).toBeInTheDocument();
    });
  });
});
