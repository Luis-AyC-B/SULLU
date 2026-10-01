import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as iconv from 'iconv-lite';

export interface FilaEstudianteCsv {
  nombre: string;
  apellido: string;
  cod_sis: string;
  ci: string | null;
}

export interface FilaRechazada {
  fila: number;
  cod_sis: string | null;
  motivo: string;
}

export interface ResultadoParseoCsv {
  totalFilas: number;
  validas: FilaEstudianteCsv[];
  rechazados: FilaRechazada[];
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

  filas.forEach((fila, index) => {
    const numeroFila = index + 2; // +1 por índice base 0, +1 por encabezado
    const nombre = fila['nombre']?.trim();
    const apellido = fila['apellido']?.trim();
    const cod_sis = fila['cod_sis']?.trim();
    const ci = fila['ci']?.trim() || null;

    const faltantes: string[] = [];
    if (!nombre) faltantes.push('nombre');
    if (!apellido) faltantes.push('apellidos');
    if (!cod_sis) faltantes.push('código');

    if (faltantes.length > 0) {
      rechazados.push({
        fila: numeroFila,
        cod_sis: cod_sis || null,
        motivo: `Falta(n) el/los campo(s) obligatorio(s): ${faltantes.join(', ')}`,
      });
      return;
    }

    if (codigosVistos.has(cod_sis)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis,
        motivo: 'Código duplicado en el archivo',
      });
      return;
    }

    codigosVistos.add(cod_sis);
    validas.push({ nombre, apellido, cod_sis, ci });
  });

  return { totalFilas: filas.length, validas, rechazados };
}
