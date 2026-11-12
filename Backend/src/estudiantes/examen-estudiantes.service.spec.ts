import { parsearCsvEstudiantes } from '../cargas-estudiantes/cargas-estudiantes.parser';
import { ExamenEstudiantesService } from './examen-estudiantes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CargasEstudiantesService } from '../cargas-estudiantes/cargas-estudiantes.service';

describe('Regresiones de importacion y cambio de estado', () => {
  it('B-1C-010: ignora filas vacias al final del CSV real', () => {
    const resultado = parsearCsvEstudiantes(
      Buffer.from(
        'nombre;apellido;cod_sis;ci\nJuan;Perez;123456;12345\nMaria;Gomez;789012;67890\n\n',
      ),
    );
    expect(resultado.totalFilas).toBe(2);
    expect(resultado.validas).toHaveLength(2);
    expect(resultado.rechazados).toEqual([]);
  });
  it('B-1C-012: el parser real admite punto y coma', () => {
    const resultado = parsearCsvEstudiantes(
      Buffer.from('nombre;apellido;cod_sis\nJuan;Perez;123456'),
    );
    expect(resultado.validas[0]).toMatchObject({
      nombre: 'Juan',
      apellido: 'Perez',
      cod_sis: '123456',
    });
    expect(resultado.rechazados).toEqual([]);
  });
  it('B-2C-001: devuelve el estado persistido al inhabilitar', async () => {
    const vinculo = { estudianteId: 1, examenId: 2, estado_habilitado: true };
    const update = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ ...vinculo, ...data }),
      );
    const prisma = {
      examen_Estudiante: {
        findUnique: jest.fn().mockResolvedValue(vinculo),
        update,
      },
    };
    const service = new ExamenEstudiantesService(
      prisma as unknown as PrismaService,
      {} as CargasEstudiantesService,
    );
    const resultado = await service.cambiarEstado(2, 1, {
      estado_habilitado: false,
      motivo_inhabilitacion: '  Observado  ',
    });
    expect(update).toHaveBeenCalledWith({
      where: { estudianteId_examenId: { estudianteId: 1, examenId: 2 } },
      data: { estado_habilitado: false, motivo_inhabilitacion: 'Observado' },
    });
    expect(resultado.estado_habilitado).toBe(false);
    expect(resultado.motivo_inhabilitacion).toBe('Observado');
  });
  it('B-2C-004: conserva columnas vacias sin desplazar CI ni codigo', () => {
    const resultado = parsearCsvEstudiantes(
      Buffer.from(
        'nombre,apellido,segundo_apellido,ci,cod_sis\nJuan,Perez,,123456,789012\nMaria,Gomez,,,345678',
      ),
    );
    expect(resultado.validas[0]).toMatchObject({
      apellido: 'Perez',
      ci: '123456',
      cod_sis: '789012',
    });
    expect(resultado.validas[1]).toMatchObject({
      apellido: 'Gomez',
      ci: null,
      cod_sis: '345678',
    });
    expect(resultado.rechazados).toEqual([]);
  });
});
