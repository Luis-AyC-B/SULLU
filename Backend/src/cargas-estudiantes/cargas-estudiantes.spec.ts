import { parsearCsvEstudiantes } from './cargas-estudiantes.parser';
import { BadRequestException } from '@nestjs/common';

describe('CargasEstudiantesParser & Flujo HU6 (Fase 1 y 2)', () => {
  it('debe procesar correctamente las 4 columnas (nombre, apellidos, codigo, ci) sin exigir correo', () => {
    const csv =
      'nombre,apellidos,codigo,ci\nJuan,Perez Rojas,2024001,8945612\nMaria,Gomez Flores,2024002,7812345';
    const res = parsearCsvEstudiantes(Buffer.from(csv, 'utf-8'));

    expect(res.totalFilas).toBe(2);
    expect(res.validas.length).toBe(2);
    expect(res.rechazados.length).toBe(0);

    const f1 = res.validas[0];
    expect(f1.nombre).toBe('Juan');
    expect(f1.apellido).toBe('Perez Rojas');
    expect(f1.cod_sis).toBe('2024001');
    expect(f1.ci).toBe('8945612');
    expect(f1.correo).toBe('2024001@est.umss.edu.bo');
    expect(f1.ciPendiente).toBe(false);
  });

  it('debe permitir CI opcional y marcar al estudiante como pendiente de CI con aviso', () => {
    const csv = 'nombre,apellidos,codigo,ci\nCarlos,Mamani Rios,2024003,';
    const res = parsearCsvEstudiantes(Buffer.from(csv, 'utf-8'));

    expect(res.validas.length).toBe(1);
    const f1 = res.validas[0];
    expect(f1.ci).toBeNull();
    expect(f1.ciPendiente).toBe(true);
    expect(f1.correo).toBe('2024003@est.umss.edu.bo');

    const avisoCi = res.avisos.find((a) => a.cod_sis === '2024003');
    expect(avisoCi).toBeDefined();
    expect(avisoCi?.motivo).toContain('pendiente de CI');
  });

  it('si viene columna opcional correo que no coincide con {codigo}@est.umss.edu.bo, genera aviso y usa el oficial', () => {
    const csv =
      'nombre,apellidos,codigo,ci,correo\nAna,Torres,2024004,6543210,ana.personal@gmail.com';
    const res = parsearCsvEstudiantes(Buffer.from(csv, 'utf-8'));

    expect(res.validas.length).toBe(1);
    expect(res.validas[0].correo).toBe('2024004@est.umss.edu.bo');
    const avisoCorreo = res.avisos.find((a) => a.cod_sis === '2024004');
    expect(avisoCorreo).toBeDefined();
    expect(avisoCorreo?.motivo).toContain(
      'no coincide con el formato institucional',
    );
  });

  it('debe rechazar filas con codigo SIS duplicado en el archivo', () => {
    const csv =
      'nombre,apellidos,codigo,ci\nJuan,Perez,2024005,111111\nPedro,Rojas,2024005,222222';
    const res = parsearCsvEstudiantes(Buffer.from(csv, 'utf-8'));

    expect(res.validas.length).toBe(1);
    expect(res.rechazados.length).toBe(1);
    expect(res.rechazados[0].motivo).toContain('Código SIS duplicado');
  });

  it('debe rechazar filas con CI duplicado en el archivo', () => {
    const csv =
      'nombre,apellidos,codigo,ci\nJuan,Perez,2024006,333333\nPedro,Rojas,2024007,333333';
    const res = parsearCsvEstudiantes(Buffer.from(csv, 'utf-8'));

    expect(res.validas.length).toBe(1);
    expect(res.rechazados.length).toBe(1);
    expect(res.rechazados[0].motivo).toContain(
      'Número de carnet (CI) duplicado',
    );
  });

  it('debe lanzar BadRequestException si el archivo supera las 5000 filas', () => {
    const header = 'nombre,apellidos,codigo,ci\n';
    const rows = Array.from(
      { length: 5001 },
      (_, i) => `Est,Apellido,${100000 + i},${200000 + i}`,
    ).join('\n');
    const buffer = Buffer.from(header + rows, 'utf-8');

    expect(() => parsearCsvEstudiantes(buffer)).toThrow(BadRequestException);
  });
});
