import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ParticionControladorService } from './particion-controlador.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ParticionControladorService', () => {
  let service: ParticionControladorService;

  const mockPrisma = {
    examen: {
      findUnique: jest.fn(),
    },
    examenControlador: {
      findMany: jest.fn(),
    },
    examen_Estudiante: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticionControladorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ParticionControladorService>(
      ParticionControladorService,
    );
  });

  describe('calcularParticion', () => {
    it('debe lanzar NotFoundException si el examen no existe', async () => {
      mockPrisma.examen.findUnique.mockResolvedValue(null);

      await expect(service.calcularParticion(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar lista vacía de grupos si no hay controladores asignados', async () => {
      mockPrisma.examen.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.examenControlador.findMany.mockResolvedValue([]);
      mockPrisma.examen_Estudiante.findMany.mockResolvedValue([]);

      const resultado = await service.calcularParticion(1);

      expect(resultado.totalControladores).toBe(0);
      expect(resultado.grupos).toEqual([]);
      expect(resultado.totalEstudiantesHabilitados).toBe(0);
    });

    it('debe asignar el rango completo si solo hay 1 controlador asignado', async () => {
      mockPrisma.examen.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.examenControlador.findMany.mockResolvedValue([
        {
          id: 10,
          colaboradorId: 5,
          rolAsignacion: 'Control principal',
          colaborador: {
            id: 5,
            nombre: 'Luciana Pedraza',
            correo: 'luciana@umss.edu.bo',
          },
        },
      ]);
      mockPrisma.examen_Estudiante.findMany.mockResolvedValue([
        {
          estudiante: {
            id: 101,
            cod_sis: '2021001',
            ci: '111',
            nombre: 'Carlos',
            apellido: 'Alvarez',
          },
        },
        {
          estudiante: {
            id: 102,
            cod_sis: '2021002',
            ci: '222',
            nombre: 'Zulma',
            apellido: 'Zeballos',
          },
        },
      ]);

      const resultado = await service.calcularParticion(1);

      expect(resultado.totalControladores).toBe(1);
      expect(resultado.totalEstudiantesHabilitados).toBe(2);
      expect(resultado.grupos).toHaveLength(1);
      expect(resultado.grupos[0].colaboradorId).toBe(5);
      expect(resultado.grupos[0].rango).toBe('A - Z');
      expect(resultado.grupos[0].totalEstudiantes).toBe(2);
      expect(resultado.grupos[0].estudianteIds).toEqual([101, 102]);
    });

    it('debe dividir equitativamente entre 2 controladores ordenados por apellido', async () => {
      mockPrisma.examen.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.examenControlador.findMany.mockResolvedValue([
        {
          id: 1,
          colaboradorId: 10,
          rolAsignacion: 'Control principal',
          colaborador: {
            id: 10,
            nombre: 'Controlador Puerta Norte',
            correo: 'puerta1@umss.edu.bo',
          },
        },
        {
          id: 2,
          colaboradorId: 20,
          rolAsignacion: 'Apoyo de ingreso',
          colaborador: {
            id: 20,
            nombre: 'Controlador Puerta Sur',
            correo: 'puerta2@umss.edu.bo',
          },
        },
      ]);

      // 4 estudiantes desordenados, con acentos para verificar normalización
      mockPrisma.examen_Estudiante.findMany.mockResolvedValue([
        {
          estudiante: {
            id: 3,
            cod_sis: '2021003',
            ci: '333',
            nombre: 'Mateo',
            apellido: 'Pérez',
          },
        },
        {
          estudiante: {
            id: 1,
            cod_sis: '2021001',
            ci: '111',
            nombre: 'Álvaro',
            apellido: 'Álvarez',
          },
        },
        {
          estudiante: {
            id: 4,
            cod_sis: '2021004',
            ci: '444',
            nombre: 'Zacarías',
            apellido: 'Zambrana',
          },
        },
        {
          estudiante: {
            id: 2,
            cod_sis: '2021002',
            ci: '222',
            nombre: 'Bruno',
            apellido: 'Benítez',
          },
        },
      ]);

      const resultado = await service.calcularParticion(1);

      expect(resultado.totalControladores).toBe(2);
      expect(resultado.totalEstudiantesHabilitados).toBe(4);
      expect(resultado.grupos).toHaveLength(2);

      // Grupo 1: Alvarez, Benitez -> Rango A - B
      const g1 = resultado.grupos[0];
      expect(g1.colaboradorId).toBe(10);
      expect(g1.totalEstudiantes).toBe(2);
      expect(g1.estudianteIds).toEqual([1, 2]);
      expect(g1.rango).toBe('A - B');

      // Grupo 2: Perez, Zambrana -> Rango P - Z
      const g2 = resultado.grupos[1];
      expect(g2.colaboradorId).toBe(20);
      expect(g2.totalEstudiantes).toBe(2);
      expect(g2.estudianteIds).toEqual([3, 4]);
      expect(g2.rango).toBe('P - Z');
    });

    it('debe distribuir el residuo equitativamente en los primeros grupos cuando N no es divisor exacto', async () => {
      mockPrisma.examen.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.examenControlador.findMany.mockResolvedValue([
        {
          id: 1,
          colaboradorId: 1,
          rolAsignacion: 'Control principal',
          colaborador: { id: 1, nombre: 'C1', correo: 'c1@test.com' },
        },
        {
          id: 2,
          colaboradorId: 2,
          rolAsignacion: 'Apoyo',
          colaborador: { id: 2, nombre: 'C2', correo: 'c2@test.com' },
        },
        {
          id: 3,
          colaboradorId: 3,
          rolAsignacion: 'Apoyo',
          colaborador: { id: 3, nombre: 'C3', correo: 'c3@test.com' },
        },
      ]);

      // 5 estudiantes para 3 controladores -> deben quedar 2, 2, 1
      const apellidos = ['Aramayo', 'Bravo', 'Castro', 'Flores', 'Vargas'];
      mockPrisma.examen_Estudiante.findMany.mockResolvedValue(
        apellidos.map((ap, idx) => ({
          estudiante: {
            id: idx + 1,
            cod_sis: `202100${idx + 1}`,
            ci: `${idx + 1}`,
            nombre: `Estudiante ${idx + 1}`,
            apellido: ap,
          },
        })),
      );

      const resultado = await service.calcularParticion(1);

      expect(resultado.grupos[0].totalEstudiantes).toBe(2);
      expect(resultado.grupos[1].totalEstudiantes).toBe(2);
      expect(resultado.grupos[2].totalEstudiantes).toBe(1);

      expect(resultado.grupos[0].rango).toBe('A - B');
      expect(resultado.grupos[1].rango).toBe('C - F');
      expect(resultado.grupos[2].rango).toBe('V');
    });
  });

  describe('validarEstudianteEnGrupo', () => {
    beforeEach(() => {
      mockPrisma.examen.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.examenControlador.findMany.mockResolvedValue([
        {
          id: 1,
          colaboradorId: 10,
          rolAsignacion: 'Control principal',
          colaborador: {
            id: 10,
            nombre: 'Luciana Pedraza',
            correo: 'luciana@umss.edu.bo',
          },
        },
        {
          id: 2,
          colaboradorId: 20,
          rolAsignacion: 'Apoyo',
          colaborador: {
            id: 20,
            nombre: 'Fernando Aguilar',
            correo: 'fernando@umss.edu.bo',
          },
        },
      ]);
      mockPrisma.examen_Estudiante.findMany.mockResolvedValue([
        {
          estudiante: {
            id: 1,
            cod_sis: '2021001',
            ci: '111',
            nombre: 'Ana',
            apellido: 'Alvarez',
          },
        },
        {
          estudiante: {
            id: 2,
            cod_sis: '2021002',
            ci: '222',
            nombre: 'Carlos',
            apellido: 'Zambrana',
          },
        },
      ]);
    });

    it('debe retornar pertenece: true si el estudiante corresponde al grupo del controlador', async () => {
      const validacion = await service.validarEstudianteEnGrupo(1, 10, 1);

      expect(validacion.pertenece).toBe(true);
      expect(validacion.grupoAsignado?.colaboradorId).toBe(10);
    });

    it('debe retornar pertenece: false y detallar el controlador correcto si el estudiante pertenece a otra fila', async () => {
      // Estudiante 2 (Zambrana) pertenece al controlador 20, pero lo intenta atender el controlador 10
      const validacion = await service.validarEstudianteEnGrupo(1, 10, 2);

      expect(validacion.pertenece).toBe(false);
      expect(validacion.grupoAsignado?.colaboradorId).toBe(10);
      expect(validacion.grupoCorrecto?.colaboradorId).toBe(20);
      expect(validacion.mensaje).toContain(
        'Zambrana Carlos no pertenece a tu grupo asignado',
      );
      expect(validacion.mensaje).toContain('Fernando Aguilar');
    });

    it('debe permitir el acceso si solo hay 1 controlador asignado en el examen', async () => {
      mockPrisma.examenControlador.findMany.mockResolvedValue([
        {
          id: 1,
          colaboradorId: 10,
          rolAsignacion: 'Control principal',
          colaborador: {
            id: 10,
            nombre: 'Luciana Pedraza',
            correo: 'luciana@umss.edu.bo',
          },
        },
      ]);

      const validacion = await service.validarEstudianteEnGrupo(1, 10, 2);

      expect(validacion.pertenece).toBe(true);
    });
  });
});
