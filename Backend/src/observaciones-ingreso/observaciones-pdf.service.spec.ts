import { Test, TestingModule } from '@nestjs/testing';
import { ObservacionesPdfService } from './observaciones-pdf.service';

describe('ObservacionesPdfService', () => {
  let service: ObservacionesPdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObservacionesPdfService],
    }).compile();

    service = module.get<ObservacionesPdfService>(ObservacionesPdfService);
  });

  it('debe generar un buffer PDF válido con cabecera %PDF-', async () => {
    const buffer = await service.generar({
      materia: 'Bases de Datos I',
      examen: 'Primer parcial',
      carrera: 'Ingeniería de Sistemas',
      ambiente: 'Laboratorio Informática 1',
      fechaExamen: '19-10-2026',
      horario: '08:15 - 09:45',
      filtros: 'Materia: Bases de Datos I | Motivo: Todos los motivos',
      total: 2,
      filas: [
        {
          hora: '09:03:44',
          codigoSis: '202104321',
          estudiante: 'Sofía Aguilar Céspedes',
          motivo: 'No habilitado',
          registradoPor: 'Carlos Mendoza',
        },
        {
          hora: '09:02:15',
          codigoSis: '202003456',
          estudiante: 'Andrés Villarroel Rocha',
          motivo: 'Doble marcación',
          registradoPor: 'Carlos Mendoza',
        },
      ],
      generadoPor: 'Carlos Docente',
      generadoEn: '19-10-2026 11:30:00',
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
