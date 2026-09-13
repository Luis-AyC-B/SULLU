/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { EstudiantesService } from './estudiantes.service';

describe('EstudiantesService (HU-01 Testing)', () => {
  let service: EstudiantesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EstudiantesService],
    }).compile();

    service = module.get<EstudiantesService>(EstudiantesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Carga Masiva de Estudiantes', () => {
    it('1. Carga exitosa: Debe registrar estudiantes válidos con estado "Habilitado"', async () => {
      const archivoEstudiantes = [
        { codigo: 'EST-101', nombre: 'Marco Vidal', ci: '6981234' },
        { codigo: 'EST-102', nombre: 'Valentina Pérez', ci: '10234882' },
      ];

      const resultado = await service.procesarCargaMasiva(archivoEstudiantes);

      expect(resultado.registrados).toBe(2);
      expect(resultado.estudiantes[0].estado).toBe('Habilitado');
    });

    it('2. Validación de dato obligatorio: Debe rechazar filas sin código de estudiante', async () => {
      const archivoConError = [
        { codigo: '', nombre: 'Sin Código', ci: '123456' },
      ];

      const resultado = await service.procesarCargaMasiva(archivoConError);

      expect(resultado.rechazados.length).toBe(1);
      expect(resultado.rechazados[0].motivo).toContain('El código de estudiante es obligatorio');
    });

    it('3. Validación de duplicados: Debe rechazar códigos duplicados en el mismo archivo', async () => {
      const archivoConDuplicados = [
        { codigo: 'EST-102', nombre: 'Diego Castillo', ci: '23881104' },
        { codigo: 'EST-102', nombre: 'Diego Castillo Duplicado', ci: '23881104' },
      ];

      const resultado = await service.procesarCargaMasiva(archivoConDuplicados);

      expect(resultado.registrados).toBe(1);
      expect(resultado.rechazados.length).toBe(1);
      expect(resultado.rechazados[0].motivo).toContain('código duplicado en el archivo');
    });
  });

  describe('Gestión de Estado', () => {
    it('4. Inhabilitar manualmente a un estudiante habilitado', async () => {
      const estudianteId = '1';
      const resultado = await service.inhabilitarEstudiante(estudianteId);

      expect(resultado.estado).toBe('Inhabilitado');
    });
  });
});