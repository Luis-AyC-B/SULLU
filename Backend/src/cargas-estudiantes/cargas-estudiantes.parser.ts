import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as iconv from 'iconv-lite';

export interface FilaEstudianteCsv {
  fila?: number;
  nombre: string;
  apellido: string;
  cod_sis: string;
  ci: string | null;
  correo: string;
  ciPendiente?: boolean;
}

export interface FilaRechazada {
  fila: number;
  cod_sis: string | null;
  correo?: string | null;
  motivo: string;
}

export interface FilaAviso {
  fila?: number;
  cod_sis: string;
  correo?: string;
  motivo: string;
}

export interface ResultadoParseoCsv {
  totalFilas: number;
  validas: FilaEstudianteCsv[];
  rechazados: FilaRechazada[];
  avisos: FilaAviso[];
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
  nombres: 'nombre',
  apellido: 'apellido',
  apellidos: 'apellido',
  codigo: 'cod_sis',
  'codigo de estudiante': 'cod_sis',
  cod_sis: 'cod_sis',
  sis: 'cod_sis',
  ci: 'ci',
  cedula: 'ci',
  'carnet de identidad': 'ci',
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
  if (buffer.length > 2 * 1024 * 1024) {
    throw new BadRequestException(
      'El archivo excede el tamaño máximo permitido de 2 MB',
    );
  }

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
  const avisos: FilaAviso[] = [];
  const validas: FilaEstudianteCsv[] = [];
  const codigosVistos = new Set<string>();
  const cisVistos = new Set<string>();

  for (let index = 0; index < filas.length; index++) {
    const fila = filas[index];
    const numeroFila = index + 2;
    const nombre = fila['nombre']?.trim();
    const apellido = fila['apellido']?.trim();
    const cod_sis = fila['cod_sis']?.trim();
    const ciRaw = fila['ci']?.trim();
    const ci = ciRaw && ciRaw.length > 0 ? ciRaw : null;
    const correoEnCsv = fila['correo']?.trim().toLowerCase();

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
      continue;
    }

    if (codigosVistos.has(cod_sis)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis,
        motivo: 'Código SIS duplicado en el archivo',
      });
      continue;
    }

    if (ci && cisVistos.has(ci)) {
      rechazados.push({
        fila: numeroFila,
        cod_sis,
        motivo: 'Número de carnet (CI) duplicado en el archivo',
      });
      continue;
    }

    const correoGenerado = `${cod_sis.toLowerCase()}@est.umss.edu.bo`;
    const correoFinal = correoGenerado;

    if (correoEnCsv && correoEnCsv.length > 0) {
      if (correoEnCsv !== correoGenerado) {
        avisos.push({
          fila: numeroFila,
          cod_sis,
          correo: correoEnCsv,
          motivo: `El correo en CSV ('${correoEnCsv}') no coincide con el formato institucional '{codigo}@est.umss.edu.bo'. Se utilizó el correo generado '${correoGenerado}'.`,
        });
      }
    }

    const ciPendiente = !ci;
    if (ciPendiente) {
      avisos.push({
        fila: numeroFila,
        cod_sis,
        correo: correoFinal,
        motivo:
          'Estudiante sin CI: se generó una contraseña temporal aleatoria (pendiente de CI).',
      });
    }

    codigosVistos.add(cod_sis);
    if (ci) cisVistos.add(ci);

    validas.push({
      fila: numeroFila,
      nombre,
      apellido,
      cod_sis,
      ci,
      correo: correoFinal,
      ciPendiente,
    });
  }

  return { totalFilas: filas.length, validas, rechazados, avisos };
}
