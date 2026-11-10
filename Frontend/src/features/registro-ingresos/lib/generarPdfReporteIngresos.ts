// src/features/registro-ingresos/lib/generarPdfReporteIngresos.ts
import type { ExamenControl, Ingreso } from '../types/ingresos.types';
import { formatHoraIngreso, formatFechaExamen } from '../types/ingresos.types';

/**
 * Convierte una cadena a PascalCase eliminando acentos y separadores
 * Ej: "Bases de Datos I" -> "BasesDeDatosI"
 * Ej: "Primer parcial" -> "PrimerParcial"
 */
export function toPascalCase(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Obtiene el nombre corto de la materia a partir del nombre completo del examen
 * Ej: "Bases de Datos I - Primer parcial - 19/10/2026" -> "Bases de Datos I"
 */
export function obtenerNombreMateria(nombreExamen: string): string {
  if (!nombreExamen) return 'Examen';
  const parts = nombreExamen.split(/[–\-]/).map((p) => p.trim());
  return parts[0] || nombreExamen;
}

/**
 * Obtiene el nombre del examen / parcial
 * Ej: "Bases de Datos I - Primer parcial" -> "Primer parcial"
 */
export function obtenerNombreParcial(nombreExamen: string): string {
  if (!nombreExamen) return 'General';
  const parts = nombreExamen.split(/[–\-]/).map((p) => p.trim());
  return parts.length > 1 ? parts[1] : 'General';
}

/**
 * Genera el nombre del archivo según el formato requerido:
 * ingresos_[Materia]_[Examen]_[Fecha].pdf
 * Ej: ingresos_BasesDeDatosI_PrimerParcial_19-10-2026.pdf
 */
export function formatearNombreArchivoReporte(
  nombreExamen: string,
  fecha: string
): string {
  const materia = toPascalCase(obtenerNombreMateria(nombreExamen)) || 'Materia';
  const examen = toPascalCase(obtenerNombreParcial(nombreExamen)) || 'Examen';

  let fechaFormateada = fecha;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y, m, d] = fecha.split('-');
    fechaFormateada = `${d}-${m}-${y}`;
  } else {
    fechaFormateada = fecha.replace(/[^a-zA-Z0-9-]/g, '');
  }

  return `ingresos_${materia}_${examen}_${fechaFormateada}.pdf`;
}

interface GenerarPdfParams {
  examen: ExamenControl;
  ingresos: Ingreso[];
  ingresados: number;
  total: number;
  docenteNombre?: string;
  fechaGeneracion?: Date;
}

/**
 * Escapa caracteres especiales en strings PDF
 */
function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Genera un archivo PDF 1.4 binario válido con el reporte de ingresos
 */
export function generarPdfReporteIngresos({
  examen,
  ingresos,
  ingresados,
  total,
  docenteNombre = 'Docente titular',
  fechaGeneracion = new Date(),
}: GenerarPdfParams): Blob {
  const materia = obtenerNombreMateria(examen.nombre);
  const parcial = obtenerNombreParcial(examen.nombre);
  const fechaStr = formatFechaExamen(examen.fecha);

  const horaGeneracionStr = fechaGeneracion.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const fechaGeneracionStr = fechaGeneracion.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 555.28;
  const ROWS_PER_PAGE = 26;

  // Dividir los ingresos en páginas
  const chunks: Ingreso[][] = [];
  if (ingresos.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < ingresos.length; i += ROWS_PER_PAGE) {
      chunks.push(ingresos.slice(i, i + ROWS_PER_PAGE));
    }
  }

  const totalPages = chunks.length;
  const pageStreamContents: string[] = [];

  chunks.forEach((chunk, pageIndex) => {
    let s = '';

    // Encabezado decorativo (barra superior azul institucional #003770 -> RGB: 0, 0.215, 0.439)
    s += 'q\n';
    s += '0 0.215 0.439 rg\n';
    s += `0 ${PAGE_HEIGHT - 35} ${PAGE_WIDTH} 35 re f\n`;
    s += 'Q\n';

    // Texto de la barra superior
    s += 'BT\n';
    s += '/F2 10 Tf\n';
    s += '1 1 1 rg\n'; // Blanco
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 23} Td\n`;
    s += `(${escapePdfText('UNIVERSIDAD MAYOR DE SAN SIMÓN · EXACONTROL')}) Tj\n`;
    s += 'ET\n';

    // Título del reporte
    s += 'BT\n';
    s += '/F2 16 Tf\n';
    s += '0 0.215 0.439 rg\n';
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 65} Td\n`;
    s += `(${escapePdfText('REPORTE DE ASISTENCIA Y REGISTRO DE INGRESOS')}) Tj\n`;
    s += 'ET\n';

    // Cuadro de metadatos del examen
    s += 'q\n';
    s += '0.94 0.96 0.98 rg\n'; // Gris azulado suave
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 135} ${MARGIN_RIGHT - MARGIN_LEFT} 60 re f\n`;
    s += '0.8 0.85 0.9 RG\n'; // Borde
    s += '1 w\n';
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 135} ${MARGIN_RIGHT - MARGIN_LEFT} 60 re S\n`;
    s += 'Q\n';

    // Contenido de metadatos
    s += 'BT\n';
    s += '/F2 9 Tf\n';
    s += '0.1 0.1 0.1 rg\n';
    s += `${MARGIN_LEFT + 10} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Materia: ${materia}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Examen: ${parcial}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Docente: ${docenteNombre}`)}) Tj\n`;
    s += 'ET\n';

    s += 'BT\n';
    s += '/F1 9 Tf\n';
    s += '0.1 0.1 0.1 rg\n';
    s += `${MARGIN_LEFT + 280} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Fecha examen: ${fechaStr}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Ingresos registrados: ${ingresados} de ${total}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Generado el: ${fechaGeneracionStr} a las ${horaGeneracionStr}`)}) Tj\n`;
    s += 'ET\n';

    // Encabezado de la tabla de ingresos
    const tableTopY = PAGE_HEIGHT - 155;
    s += 'q\n';
    s += '0 0.215 0.439 rg\n';
    s += `${MARGIN_LEFT} ${tableTopY - 18} ${MARGIN_RIGHT - MARGIN_LEFT} 18 re f\n`;
    s += 'Q\n';

    // Textos de columnas
    s += 'BT\n';
    s += '/F2 8 Tf\n';
    s += '1 1 1 rg\n';
    s += `${MARGIN_LEFT + 5} ${tableTopY - 13} Td (${escapePdfText('#')}) Tj\n`;
    s += `${MARGIN_LEFT + 25} ${tableTopY - 13} Td (${escapePdfText('HORA')}) Tj\n`;
    s += `${MARGIN_LEFT + 80} ${tableTopY - 13} Td (${escapePdfText('CÓDIGO SIS')}) Tj\n`;
    s += `${MARGIN_LEFT + 155} ${tableTopY - 13} Td (${escapePdfText('ESTUDIANTE')}) Tj\n`;
    s += `${MARGIN_LEFT + 320} ${tableTopY - 13} Td (${escapePdfText('MÉTODO')}) Tj\n`;
    s += `${MARGIN_LEFT + 380} ${tableTopY - 13} Td (${escapePdfText('ESTADO')}) Tj\n`;
    s += `${MARGIN_LEFT + 445} ${tableTopY - 13} Td (${escapePdfText('CASO EXCEPCIONAL')}) Tj\n`;
    s += 'ET\n';

    // Filas de la tabla
    let currentY = tableTopY - 18;
    const ROW_HEIGHT = 18;

    if (chunk.length === 0) {
      s += 'BT\n';
      s += '/F1 9 Tf\n';
      s += '0.5 0.5 0.5 rg\n';
      s += `${MARGIN_LEFT + 150} ${currentY - 20} Td\n`;
      s += `(${escapePdfText('No hay registros de ingreso para este examen.')}) Tj\n`;
      s += 'ET\n';
    } else {
      chunk.forEach((item, rIdx) => {
        const rowY = currentY - ROW_HEIGHT;
        const globalIdx = pageIndex * ROWS_PER_PAGE + rIdx + 1;

        if (rIdx % 2 === 1) {
          s += 'q\n';
          s += '0.97 0.97 0.98 rg\n';
          s += `${MARGIN_LEFT} ${rowY} ${MARGIN_RIGHT - MARGIN_LEFT} ${ROW_HEIGHT} re f\n`;
          s += 'Q\n';
        }

        s += 'q\n';
        s += '0.88 0.88 0.9 RG\n';
        s += '0.5 w\n';
        s += `${MARGIN_LEFT} ${rowY} m ${MARGIN_RIGHT} ${rowY} l S\n`;
        s += 'Q\n';

        const horaFormateada = formatHoraIngreso(item.hora);
        const caso = (item as unknown as { casoExcepcional?: string }).casoExcepcional || '—';

        s += 'BT\n';
        s += '/F1 8 Tf\n';
        s += '0.15 0.15 0.15 rg\n';
        s += `${MARGIN_LEFT + 5} ${rowY + 5} Td (${escapePdfText(String(globalIdx))}) Tj\n`;
        s += `${MARGIN_LEFT + 25} ${rowY + 5} Td (${escapePdfText(horaFormateada)}) Tj\n`;
        s += `${MARGIN_LEFT + 80} ${rowY + 5} Td (${escapePdfText(item.sis)}) Tj\n`;
        s += `${MARGIN_LEFT + 155} ${rowY + 5} Td (${escapePdfText(item.estudiante.slice(0, 28))}) Tj\n`;
        s += `${MARGIN_LEFT + 320} ${rowY + 5} Td (${escapePdfText(item.metodo)}) Tj\n`;
        s += `${MARGIN_LEFT + 380} ${rowY + 5} Td (${escapePdfText(item.estado)}) Tj\n`;
        s += `${MARGIN_LEFT + 445} ${rowY + 5} Td (${escapePdfText(caso.slice(0, 20))}) Tj\n`;
        s += 'ET\n';

        currentY = rowY;
      });
    }

    // Pie de página
    s += 'q\n';
    s += '0.8 0.8 0.8 RG\n';
    s += '0.5 w\n';
    s += `${MARGIN_LEFT} 35 m ${MARGIN_RIGHT} 35 l S\n`;
    s += 'Q\n';

    s += 'BT\n';
    s += '/F1 8 Tf\n';
    s += '0.45 0.45 0.45 rg\n';
    s += `${MARGIN_LEFT} 22 Td\n`;
    s += `(${escapePdfText('Este documento es un reporte oficial emitido por el sistema ExaControl UMSS.')}) Tj\n`;
    s += `${MARGIN_RIGHT - 65} 22 Td\n`;
    s += `(${escapePdfText(`Página ${pageIndex + 1} de ${totalPages}`)}) Tj\n`;
    s += 'ET\n';

    pageStreamContents.push(s);
  });

  const objects: string[] = [];

  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontRegularObjNum = 3 + totalPages;
  const fontBoldObjNum = 4 + totalPages;

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj`);

  const pageKids = Array.from({ length: totalPages }, (_, i) => `${3 + i} 0 R`).join(' ');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageKids}] /Count ${totalPages} >>\nendobj`
  );

  for (let i = 0; i < totalPages; i++) {
    const pageNum = 3 + i;
    const contentStreamNum = fontBoldObjNum + 1 + i;
    objects.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentStreamNum} 0 R /Resources << /Font << /F1 ${fontRegularObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> >>\nendobj`
    );
  }

  objects.push(
    `${fontRegularObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
  );
  objects.push(
    `${fontBoldObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`
  );

  for (let i = 0; i < totalPages; i++) {
    const streamContent = pageStreamContents[i];
    const streamLen = Buffer.byteLength(streamContent, 'utf-8');
    const contentStreamNum = fontBoldObjNum + 1 + i;
    objects.push(
      `${contentStreamNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  }

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }

  const xrefOffset = body.length;
  const totalObjCount = objects.length + 1;
  body += `xref\n0 ${totalObjCount}\n0000000000 65535 f \n`;

  for (let i = 1; i < totalObjCount; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${totalObjCount} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([body], { type: 'application/pdf' });
}
