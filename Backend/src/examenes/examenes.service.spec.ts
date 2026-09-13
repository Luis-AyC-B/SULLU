/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ExamenesService } from './examenes.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('ExamenesService (HU-02 Registrar Examen)', () => {
  let service: ExamenesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamenesService],
    }).compile();

    service = module.get<ExamenesService>(ExamenesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Registro de Examen', () => {
    it('1. Éxito: Debe registrar un examen válido con estado "Programado" y asignar al docente', async () => {
      const dto = {
        asignatura: 'Cálculo I',
        fecha: '2026-10-15',
        hora: '08:00',
        duracionMinutos: 90,
        ambienteId: 'Ambiente-204',
      };

      const resultado = await service.create(dto, 'docente-123');

      expect(resultado.estado).toBe('Programado');
      expect(resultado.docenteId).toBe('docente-123');
    });

    it('2. Error: Debe rechazar si falta algún campo obligatorio', async () => {
      const dto = {
        asignatura: '',
        fecha: '2026-10-15',
        hora: '08:00',
        duracionMinutos: 90,
        ambienteId: 'Ambiente-204',
      };

      await expect(service.create(dto, 'docente-123')).rejects.toThrow(BadRequestException);
    });

    it('3. Error: Debe rechazar si hay cruce de horario en el mismo ambiente', async () => {
      const dto = {
        asignatura: 'Física I',
        fecha: '2026-10-20',
        hora: '10:00',
        duracionMinutos: 90,
        ambienteId: 'Aula-101',
      };

      await service.create(dto, 'docente-123'); // Primero registrado

      await expect(service.create(dto, 'docente-456')).rejects.toThrow(ConflictException);
    });

    it('4. Error: Debe rechazar registros con fechas pasadas', async () => {
      const dto = {
        asignatura: 'Álgebra',
        fecha: '2020-01-01',
        hora: '08:00',
        duracionMinutos: 90,
        ambienteId: 'Aula-101',
      };

      await expect(service.create(dto, 'docente-123')).rejects.toThrow(BadRequestException);
    });
  });
});