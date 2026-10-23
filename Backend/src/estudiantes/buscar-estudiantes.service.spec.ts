import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BuscarEstudiantesService } from './buscar-estudiantes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UT1-HU8: BuscarEstudiantesService', () => {
  let service: BuscarEstudiantesService;
  let prismaMock: {
    estudiante: {
      findMany: jest.Mock;
    };
  };

  const mockEstudiantes = [
    {
      id: 1,
      cod_sis: '202110234',
      ci: '8765432',
      nombre: 'Ángel',
      apellido: 'Pérez Gómez',
    },
    {
      id: 2,
      cod_sis: '201901234',
      ci: '7654321',
      nombre: 'María',
      apellido: 'López Quispe',
    },
    {
      id: 3,
      cod_sis: '202005819',
      ci: '6543210',
      nombre: 'Raúl',
      apellido: 'Fernández Castro',
    },
  ];

  beforeEach(async () => {
    prismaMock = {
      estudiante: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarEstudiantesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<BuscarEstudiantesService>(BuscarEstudiantesService);
  });

  // Caso 1: Búsqueda por código SIS exacto
  it('1. Búsqueda por código SIS exacto: Retorna 1 estudiante con nombre, código SIS, carnet y carrera', async () => {
    prismaMock.estudiante.findMany.mockResolvedValue([mockEstudiantes[0]]);

    const result = await service.buscar('202110234');

    expect(result).toHaveLength(1);
    expect(result[0].codSis).toBe('202110234');
    expect(result[0].nombre).toBe('Ángel');
    expect(result[0].ci).toBe('8765432');
    expect(result[0].carrera).toBeDefined();
  });

  // Caso 2: Búsqueda por carnet
  it('2. Búsqueda por carnet: Retorna 1 estudiante', async () => {
    prismaMock.estudiante.findMany.mockResolvedValue([mockEstudiantes[1]]);

    const result = await service.buscar('7654321');

    expect(result).toHaveLength(1);
    expect(result[0].ci).toBe('7654321');
    expect(result[0].nombre).toBe('María');
  });

  // Caso 3: Nombre parcial en mayúsculas y sin tildes
  it('3. Nombre parcial en mayúsculas y sin tildes: Retorna todas las coincidencias, sin distinguir mayúsculas ni tildes', async () => {
    prismaMock.estudiante.findMany.mockResolvedValue(mockEstudiantes);

    // Buscamos "ANGEL" en mayúsculas y sin tilde para encontrar a "Ángel"
    const result = await service.buscar('ANGEL');

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].nombre).toBe('Ángel');
  });

  // Caso 4: Término menor al mínimo
  it('4. Término menor al mínimo: Lanza error de validación y no consulta el repositorio', async () => {
    await expect(service.buscar('a')).rejects.toThrow(BadRequestException);
    await expect(service.buscar(' ')).rejects.toThrow(BadRequestException);
    expect(prismaMock.estudiante.findMany).not.toHaveBeenCalled();
  });

  // Caso 5: Sin coincidencias
  it('5. Sin coincidencias: Retorna lista vacía', async () => {
    prismaMock.estudiante.findMany.mockResolvedValue([]);

    const result = await service.buscar('inexistente999');

    expect(result).toEqual([]);
  });
});
