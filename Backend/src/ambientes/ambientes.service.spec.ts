/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { AmbientesService } from './ambientes.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('AmbientesService (HU-04 Gestión de Ambientes)', () => {
  let service: AmbientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmbientesService],
    }).compile();

    service = module.get<AmbientesService>(AmbientesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Registro y Edición de Ambientes', () => {
    it('1. Éxito: Debe registrar un nuevo ambiente con datos válidos', async () => {
      const dto = {
        codigo: 'Aula-204',
        ubicacion: 'Bloque Antiguo',
        capacidad: 40,
      };

      const resultado = await service.create(dto);

      expect(resultado.codigo).toBe('Aula-204');
      expect(resultado.estado).toBe('Disponible');
    });

    it('2. Error: Debe rechazar ambientes con código duplicado', async () => {
      const dto = {
        codigo: 'Aula-101',
        ubicacion: 'Edificio Central',
        capacidad: 30,
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('3. Error: Debe rechazar capacitaciones cero o negativas', async () => {
      const dto = {
        codigo: 'Aula-999',
        ubicacion: 'Laboratorios',
        capacidad: -10,
      };

      await expect(service.create(dto)).rejects.toThrow('La capacidad debe ser un número entero positivo');
    });

    it('4. Éxito: Debe actualizar el estado de un ambiente', async () => {
      const resultado = await service.updateEstado('1', 'En uso');

      expect(resultado.estado).toBe('En uso');
    });
  });
});