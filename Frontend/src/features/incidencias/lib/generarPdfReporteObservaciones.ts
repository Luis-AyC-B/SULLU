// src/features/incidencias/lib/generarPdfReporteObservaciones.ts
import type { ExamenIncidencia, Incidencia } from "../types/incidencias.types";
import {
  formatHoraIncidencia,
  formatFechaExamen,
  getMotivoLabel,
} from "../types/incidencias.types";

/**
 * Convierte texto a PascalCase eliminando acentos y caracteres especiales
 */
export function toPascalCase(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Extrae el nombre de la materia a partir del nombre completo del examen
 */
export function obtenerNombreMateriaIncidencia(nombreExamen: string): string {
  if (!nombreExamen) return "Examen";
  const parts = nombreExamen.split(/[–\-]/).map((p) => p.trim());
  return parts[0] || nombreExamen;
}

/**
 * Extrae el parcial/tipo de examen
 */
export function obtenerNombreParcialIncidencia(nombreExamen: string): string {
  if (!nombreExamen) return "General";
  const parts = nombreExamen.split(/[–\-]/).map((p) => p.trim());
  return parts.length > 1 ? parts[1] : "General";
}

/**
 * Genera el nombre del archivo PDF de observaciones
 * Ej: observaciones_BasesDeDatosI_PrimerParcial_19-10-2026.pdf
 */
export function formatearNombreArchivoObservaciones(
  nombreExamen: string,
  fecha: string
): string {
  const materia =
    toPascalCase(obtenerNombreMateriaIncidencia(nombreExamen)) || "Materia";
  const examen =
    toPascalCase(obtenerNombreParcialIncidencia(nombreExamen)) || "Examen";

  let fechaFormateada = fecha;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y, m, d] = fecha.split("-");
    fechaFormateada = `${d}-${m}-${y}`;
  } else {
    fechaFormateada = fecha.replace(/[^a-zA-Z0-9-]/g, "");
  }

  return `observaciones_${materia}_${examen}_${fechaFormateada}.pdf`;
}

interface GenerarPdfObservacionesParams {
  examen: ExamenIncidencia;
  incidencias: Incidencia[];
  filtroMotivo?: string;
  generadoPor?: string;
  fechaGeneracion?: Date;
}

function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Genera un archivo binario PDF 1.4 estándar con el reporte de observaciones
 */
export function generarPdfReporteObservaciones({
  examen,
  incidencias,
  filtroMotivo = "TODOS",
  generadoPor = "Docente titular",
  fechaGeneracion = new Date(),
}: GenerarPdfObservacionesParams): Blob {
  const materia = obtenerNombreMateriaIncidencia(examen.nombre);
  const parcial = obtenerNombreParcialIncidencia(examen.nombre);
  const fechaStr = formatFechaExamen(examen.fecha);

  const horaGeneracionStr = fechaGeneracion.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const fechaGeneracionStr = fechaGeneracion.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const motivoFiltroTexto =
    filtroMotivo === "TODOS" || !filtroMotivo
      ? "Todos los motivos"
      : getMotivoLabel(filtroMotivo);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 555.28;
  const ROWS_PER_PAGE = 26;

  const chunks: Incidencia[][] = [];
  if (incidencias.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < incidencias.length; i += ROWS_PER_PAGE) {
      chunks.push(incidencias.slice(i, i + ROWS_PER_PAGE));
    }
  }

  const totalPages = chunks.length;
  const pageStreamContents: string[] = [];

  chunks.forEach((chunk, pageIndex) => {
    let s = "";

    // Franja superior institucional azul #003770
    s += "q\n";
    s += "0 0.215 0.439 rg\n";
    s += `0 ${PAGE_HEIGHT - 35} ${PAGE_WIDTH} 35 re f\n`;
    s += "Q\n";

    // Texto superior
    s += "BT\n";
    s += "/F2 10 Tf\n";
    s += "1 1 1 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 23} Td\n`;
    s += `(${escapePdfText("UNIVERSIDAD MAYOR DE SAN SIMÓN · EXACONTROL")}) Tj\n`;
    s += "ET\n";

    // Título del reporte
    s += "BT\n";
    s += "/F2 16 Tf\n";
    s += "0 0.215 0.439 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 65} Td\n`;
    s += `(${escapePdfText("REPORTE DE OBSERVACIONES DE INGRESO")}) Tj\n`;
    s += "ET\n";

    // Caja de detalles del examen y filtros aplicados
    s += "q\n";
    s += "0.94 0.96 0.98 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 138} ${MARGIN_RIGHT - MARGIN_LEFT} 62 re f\n`;
    s += "0.8 0.85 0.9 RG\n";
    s += "1 w\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 138} ${MARGIN_RIGHT - MARGIN_LEFT} 62 re S\n`;
    s += "Q\n";

    // Textos de metadatos
    s += "BT\n";
    s += "/F2 9 Tf\n";
    s += "0.1 0.1 0.1 rg\n";
    s += `${MARGIN_LEFT + 10} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Materia: ${materia}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Examen: ${parcial}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Filtro motivo: ${motivoFiltroTexto}`)}) Tj\n`;
    s += "ET\n";

    s += "BT\n";
    s += "/F1 9 Tf\n";
    s += "0.1 0.1 0.1 rg\n";
    s += `${MARGIN_LEFT + 280} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Fecha examen: ${fechaStr}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Total observaciones: ${incidencias.length}`)}) Tj\n`;
    s += `0 -14 Td\n`;
    s += `(${escapePdfText(`Generado: ${fechaGeneracionStr} ${horaGeneracionStr} por ${generadoPor}`)}) Tj\n`;
    s += "ET\n";

    // Encabezado de la tabla
    const tableTopY = PAGE_HEIGHT - 158;
    s += "q\n";
    s += "0 0.215 0.439 rg\n";
    s += `${MARGIN_LEFT} ${tableTopY - 18} ${MARGIN_RIGHT - MARGIN_LEFT} 18 re f\n`;
    s += "Q\n";

    // Columnas de la tabla de observaciones:
    // Hora, Código SIS, Estudiante, Motivo, Registrado por
    s += "BT\n";
    s += "/F2 8 Tf\n";
    s += "1 1 1 rg\n";
    s += `${MARGIN_LEFT + 5} ${tableTopY - 13} Td (${escapePdfText("#")}) Tj\n`;
    s += `${MARGIN_LEFT + 25} ${tableTopY - 13} Td (${escapePdfText("HORA")}) Tj\n`;
    s += `${MARGIN_LEFT + 80} ${tableTopY - 13} Td (${escapePdfText("CÓDIGO SIS")}) Tj\n`;
    s += `${MARGIN_LEFT + 160} ${tableTopY - 13} Td (${escapePdfText("ESTUDIANTE")}) Tj\n`;
    s += `${MARGIN_LEFT + 325} ${tableTopY - 13} Td (${escapePdfText("MOTIVO")}) Tj\n`;
    s += `${MARGIN_LEFT + 435} ${tableTopY - 13} Td (${escapePdfText("REGISTRADO POR")}) Tj\n`;
    s += "ET\n";

    let currentY = tableTopY - 18;
    const ROW_HEIGHT = 18;

    if (chunk.length === 0) {
      s += "BT\n";
      s += "/F1 9 Tf\n";
      s += "0.5 0.5 0.5 rg\n";
      s += `${MARGIN_LEFT + 140} ${currentY - 20} Td\n`;
      s += `(${escapePdfText("No se registraron observaciones con los filtros seleccionados.")}) Tj\n`;
      s += "ET\n";
    } else {
      chunk.forEach((item, rIdx) => {
        const rowY = currentY - ROW_HEIGHT;
        const globalIdx = pageIndex * ROWS_PER_PAGE + rIdx + 1;

        if (rIdx % 2 === 1) {
          s += "q\n";
          s += "0.97 0.97 0.98 rg\n";
          s += `${MARGIN_LEFT} ${rowY} ${MARGIN_RIGHT - MARGIN_LEFT} ${ROW_HEIGHT} re f\n`;
          s += "Q\n";
        }

        s += "q\n";
        s += "0.88 0.88 0.9 RG\n";
        s += "0.5 w\n";
        s += `${MARGIN_LEFT} ${rowY} m ${MARGIN_RIGHT} ${rowY} l S\n`;
        s += "Q\n";

        const horaFormateada = formatHoraIncidencia(item.fechaHora);
        const labelMotivo = getMotivoLabel(item.motivo);

        s += "BT\n";
        s += "/F1 8 Tf\n";
        s += "0.15 0.15 0.15 rg\n";
        s += `${MARGIN_LEFT + 5} ${rowY + 5} Td (${escapePdfText(String(globalIdx))}) Tj\n`;
        s += `${MARGIN_LEFT + 25} ${rowY + 5} Td (${escapePdfText(horaFormateada)}) Tj\n`;
        s += `${MARGIN_LEFT + 80} ${rowY + 5} Td (${escapePdfText(item.codigoSis)}) Tj\n`;
        s += `${MARGIN_LEFT + 160} ${rowY + 5} Td (${escapePdfText(item.estudianteNombre.slice(0, 26))}) Tj\n`;
        s += `${MARGIN_LEFT + 325} ${rowY + 5} Td (${escapePdfText(labelMotivo.slice(0, 20))}) Tj\n`;
        s += `${MARGIN_LEFT + 435} ${rowY + 5} Td (${escapePdfText((item.registradoPor || "Control").slice(0, 18))}) Tj\n`;
        s += "ET\n";

        currentY = rowY;
      });
    }

    // Pie de página
    s += "q\n";
    s += "0.8 0.8 0.8 RG\n";
    s += "0.5 w\n";
    s += `${MARGIN_LEFT} 35 m ${MARGIN_RIGHT} 35 l S\n`;
    s += "Q\n";

    s += "BT\n";
    s += "/F1 8 Tf\n";
    s += "0.45 0.45 0.45 rg\n";
    s += `${MARGIN_LEFT} 22 Td\n`;
    s += `(${escapePdfText("Reporte oficial de observaciones emitido por el sistema ExaControl · UMSS.")}) Tj\n`;
    s += `${MARGIN_RIGHT - 65} 22 Td\n`;
    s += `(${escapePdfText(`Página ${pageIndex + 1} de ${totalPages}`)}) Tj\n`;
    s += "ET\n";

    pageStreamContents.push(s);
  });

  const objects: string[] = [];
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontRegularObjNum = 3 + totalPages;
  const fontBoldObjNum = 4 + totalPages;

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj`);

  const pageKids = Array.from({ length: totalPages }, (_, i) => `${3 + i} 0 R`).join(" ");
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
    const streamLen = Buffer.byteLength(streamContent, "utf-8");
    const contentStreamNum = fontBoldObjNum + 1 + i;
    objects.push(
      `${contentStreamNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  }

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }

  const xrefOffset = body.length;
  const totalObjCount = objects.length + 1;
  body += `xref\n0 ${totalObjCount}\n0000000000 65535 f \n`;

  for (let i = 1; i < totalObjCount; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${totalObjCount} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([body], { type: "application/pdf" });
}
