import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as iconv from 'iconv-lite';

export interface FilaEstudianteCsv {
  fila?: number;
  nombre: string;
  apellido: string;
  cod_sis: string;
  ci: string | null;
  correo: string | null;
}

export interface FilaRechazada {
  fila: number;
  cod_sis: string | null;
  correo?: string | null;
  motivo: string;
}

export interface ResultadoParseoCsv {
  totalFilas: number;
  validas: FilaEstudianteCsv[];
  rechazados: FilaRechazada[];
}

export const DOMINIOS_ESTUDIANTE: string[] = (
  process.env.DOMINIOS_ESTUDIANTE ?? '@est.umss.edu.bo,@est.umss.edu'
)
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function esCorreoInstitucionalValido(correo: string): boolean {
  const c = correo.toLowerCase();
  return EMAIL_REGEX.test(c) && DOMINIOS_ESTUDIANTE.some((d) => c.endsWith(d));
}

const MAPA_HEADERS: Record<string, string> = {
  nombre: 'nombre',
  apellido: 'apellido',
  apellidos: 'apellido',
  codigo: 'cod_sis',
  'codigo de estudiante': 'cod_sis',
  cod_sis: 'cod_sis',
  ci: 'ci',
  cedula: 'ci',
  correo: 'correo',
  email: 'correo',
  'correo institucional': 'correo',
  'correo electronico': 'correo',
};

function normalizarHeader(header: string): string {
  const limpio = header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return MAPA_HEADERS[limpio] ?? limpio;
}

function decodificarBuffer(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return iconv.decode(buffer, 'win1252');
  }
}

export function parsearCsvEstudiantes(buffer: Buffer): ResultadoParseoCsv {
  const contenido = decodificarBuffer(buffer);

  let filas: Record<string, string>[];
  try {
    filas = parse(contenido, {
      columns: (header: string[]) => header.map((h) => normalizarHeader(h)),
      delimiter: [',', ';', '\t'],
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch {
    throw new BadRequestException(
      'El archivo no pudo ser procesado, verifique el formato',
    );
  }

  if (!filas || filas.length === 0) {
    throw new BadRequestException('El archivo no contiene datos para procesar');
  }

  if (filas.length > 5000) {
    throw new BadRequestException('El archivo excede el máximo de 5000 filas');
  }

  const rechazados: FilaRechazada[] = [];
  const validas: FilaEstudianteCsv[] = [];
  const codigosVistos = new Set<string>();
  const correosVistos = new Set<string>();

  for (let index = 0; index < filas.length; index++) {
    const fila = filas[index];
    const numeroFila = index + 2;
    const nombre = fila['nombre']?.trim();
    const apellido = fila['apellido']?.trim();
    const cod_sis = fila['cod_sis']?.trim();
    const ci = fila['ci']?.trim() || null;
    const correo = fila['correo']?.trim().toLowerCase();

    const faltantes: string[] = [];
    if (!nombre) faltantes.push('nombre');
    if (!apellido) faltantes.push('apellidos');
    if (!cod_sis) faltantes.push('código');
    if (!correo) faltantes.push('correo institucional');

    if (faltantes.length > 0) {
      rechazados.push({
        fila: numeroFila,
        cod_sis: cod_sis || null,
        correo: correo || null,
        motivo: `Falta(n) el/los campo(s) obligatorio(s): ${faltantes.join(', ')}`,
      });
      continue;
    }

    if (!esCorreoInstitucionalValido(correo)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis: cod_sis || null,
        correo,
        motivo: `El correo debe pertenecer a un dominio institucional válido (${DOMINIOS_ESTUDIANTE.join(', ')})`,
      });
      continue;
    }

    if (codigosVistos.has(cod_sis)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis,
        correo,
        motivo: 'Código SIS duplicado en el archivo',
      });
      continue;
    }

    if (correosVistos.has(correo)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis,
        correo,
        motivo: 'Correo institucional duplicado en el archivo',
      });
      continue;
    }

    codigosVistos.add(cod_sis);
    correosVistos.add(correo);
    validas.push({
      fila: numeroFila,
      nombre,
      apellido,
      cod_sis,
      ci,
      correo,
    });
  }

  return { totalFilas: filas.length, validas, rechazados };
}
