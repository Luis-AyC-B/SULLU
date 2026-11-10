// src/features/incidencias/lib/generarPdfReporteObservaciones.ts
import type { ExamenIncidencia, Incidencia } from "../types/incidencias.types";
import { getMotivoLabel } from "../types/incidencias.types";

function toPascalCase(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function formatFechaExamen(fechaIso: string): string {
  if (!fechaIso) return "Sin fecha";
  try {
    const parts = fechaIso.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaIso;
  } catch {
    return fechaIso;
  }
}

export function obtenerNombreMateriaIncidencia(nombreExamen: string): string {
  const parts = nombreExamen.split(/[–—-]/).map((s) => s.trim());
  return parts[0] || nombreExamen;
}

export function obtenerNombreParcialIncidencia(nombreExamen: string): string {
  const parts = nombreExamen.split(/[–—-]/).map((s) => s.trim());
  return parts.length > 1 ? parts[1] : "General";
}

export interface OpcionesNombreArchivoObservaciones {
  facultad?: string;
  materia?: string;
  gestion?: string;
  fecha?: string;
  nombreExamen?: string;
}

/**
 * Genera el nombre del archivo PDF de observaciones según Criterio 32:
 * observaciones_[Facultad]_[Materia]_[Gestion]_[Fecha].pdf
 * Ej: observaciones_FCyT_BasesDeDatosI_Gestion2-2026_19-10-2026.pdf
 * Si no se filtró facultad: observaciones_BasesDeDatosI_Gestion2-2026_19-10-2026.pdf
 * Si se seleccionó todas las materias: observaciones_TodasLasMaterias_Gestion2-2026_19-10-2026.pdf
 * Soporta llamadas con objeto o con parámetros posicionales.
 */
export function formatearNombreArchivoObservaciones(
  opcionesONombre: string | OpcionesNombreArchivoObservaciones,
  fechaLegacy?: string,
  facultadLegacy?: string,
  gestionLegacy?: string
): string {
  if (typeof opcionesONombre === "string" && !facultadLegacy && !gestionLegacy) {
    const nombreExamen = opcionesONombre;
    const fecha = fechaLegacy || new Date().toISOString().slice(0, 10);
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

  const opts: OpcionesNombreArchivoObservaciones =
    typeof opcionesONombre === "object"
      ? opcionesONombre
      : {
          materia: opcionesONombre,
          fecha: fechaLegacy,
          facultad: facultadLegacy,
          gestion: gestionLegacy,
        };

  const { facultad, materia, gestion, fecha, nombreExamen } = opts;

  let facultadStr = "";
  if (
    facultad &&
    facultad !== "TODAS" &&
    !facultad.toLowerCase().includes("todas")
  ) {
    const matchAcronym = /\(([A-Za-z0-9]+)\)/.exec(facultad);
    facultadStr = matchAcronym
      ? matchAcronym[1]
      : toPascalCase(facultad) || "FCyT";
  }

  let materiaStr = "TodasLasMaterias";
  if (materia && materia !== "TODAS" && !materia.toLowerCase().includes("todas")) {
    materiaStr =
      toPascalCase(obtenerNombreMateriaIncidencia(materia)) || "Materia";
  } else if (nombreExamen) {
    materiaStr =
      toPascalCase(obtenerNombreMateriaIncidencia(nombreExamen)) || "Materia";
  }

  const gestionStr = gestion
    ? gestion
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .replace(/\//g, "-")
    : "Gestion2-2026";

  let fechaStr = fecha || new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [y, m, d] = fechaStr.split("-");
    fechaStr = `${d}-${m}-${y}`;
  } else {
    fechaStr = fechaStr.replace(/[^a-zA-Z0-9-]/g, "");
  }

  if (facultadStr) {
    return `observaciones_${facultadStr}_${materiaStr}_${gestionStr}_${fechaStr}.pdf`;
  }
  return `observaciones_${materiaStr}_${gestionStr}_${fechaStr}.pdf`;
}

export interface GenerarPdfObservacionesParams {
  examen?: ExamenIncidencia | null;
  examenesLista?: ExamenIncidencia[];
  incidencias: Incidencia[];
  filtroMotivo?: string;
  filtrosAplicados?: {
    facultad?: string;
    carrera?: string;
    docente?: string;
    materia?: string;
    gestion?: string;
    examen?: string;
    motivo?: string;
  };
  generadoPor?: string;
  fechaGeneracion?: Date;
}

function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remueve tildes para PDF 1.4 simple WinAnsiEncoding
}

/**
 * Genera un archivo binario PDF 1.4 estándar con el reporte de observaciones (Criterios 23-27).
 * Incluye encabezado con filtros aplicados, tabla con columnas Hora, Código SIS, Estudiante,
 * Motivo, Registrado por, total, y fecha/hora/usuario generador.
 */
export function generarPdfReporteObservaciones({
  examen,
  examenesLista = [],
  incidencias,
  filtroMotivo = "TODOS",
  filtrosAplicados,
  generadoPor = "Docente titular",
  fechaGeneracion = new Date(),
}: GenerarPdfObservacionesParams): Blob {
  const materia =
    filtrosAplicados?.materia ||
    (examen ? obtenerNombreMateriaIncidencia(examen.nombre) : "Todas las materias");
  const examenNombre =
    filtrosAplicados?.examen ||
    (examen ? obtenerNombreParcialIncidencia(examen.nombre) : "Todos los exámenes");
  const fechaExamen = examen ? formatFechaExamen(examen.fecha) : "Varios";

  const horaGeneracionStr = fechaGeneracion.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fechaGeneracionStr = fechaGeneracion.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const motivoFiltroTexto =
    filtrosAplicados?.motivo ||
    (filtroMotivo === "TODOS" || !filtroMotivo
      ? "Todos los motivos"
      : getMotivoLabel(filtroMotivo));

  const facultadTexto = filtrosAplicados?.facultad || (examen?.facultad ?? "Todas las facultades");
  const gestionTexto = filtrosAplicados?.gestion || (examen?.gestion ?? "Gestión 2/2026");

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 555.28;
  const ROWS_PER_PAGE = 24;

  const chunks: Incidencia[][] = [];
  if (incidencias.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < incidencias.length; i += ROWS_PER_PAGE) {
      chunks.push(incidencias.slice(i, i + ROWS_PER_PAGE));
    }
  }

  const totalPages = chunks.length;
  const pageObjectNumbers: number[] = [];
  const objects: { num: number; content: string }[] = [];
  let nextObjNum = 3;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageObjNum = nextObjNum++;
    const contentStreamObjNum = nextObjNum++;
    pageObjectNumbers.push(pageObjNum);

    const rows = chunks[pageIdx];

    let s = "";

    // Franja azul superior decorativa
    s += "q\n";
    s += "0 0.215 0.439 rg\n";
    s += `0 ${PAGE_HEIGHT - 6} ${PAGE_WIDTH} 6 re f\n`;
    s += "Q\n";

    // Título institucional
    s += "BT\n";
    s += "/F2 16 Tf\n";
    s += "0 0.215 0.439 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 42} Td\n`;
    s += `(${escapePdfText("UNIVERSIDAD MAYOR DE SAN SIMON")}) Tj\n`;
    s += "ET\n";

    s += "BT\n";
    s += "/F1 12 Tf\n";
    s += "0.2 0.2 0.2 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 60} Td\n`;
    s += `(${escapePdfText("REPORTE DE OBSERVACIONES DE INGRESO")}) Tj\n`;
    s += "ET\n";

    // Caja de detalles del examen y filtros aplicados (Criterio 25)
    s += "q\n";
    s += "0.94 0.96 0.98 rg\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 146} ${MARGIN_RIGHT - MARGIN_LEFT} 70 re f\n`;
    s += "0.8 0.85 0.9 RG\n";
    s += "1 w\n";
    s += `${MARGIN_LEFT} ${PAGE_HEIGHT - 146} ${MARGIN_RIGHT - MARGIN_LEFT} 70 re S\n`;
    s += "Q\n";

    // Textos de metadatos columna izquierda
    s += "BT\n";
    s += "/F2 8.5 Tf\n";
    s += "0.1 0.1 0.1 rg\n";
    s += `${MARGIN_LEFT + 10} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Materia: ${materia}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Examen: ${examenNombre}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Filtro motivo: ${motivoFiltroTexto}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Facultad: ${facultadTexto}`)}) Tj\n`;
    s += "ET\n";

    // Textos de metadatos columna derecha
    s += "BT\n";
    s += "/F1 8.5 Tf\n";
    s += "0.1 0.1 0.1 rg\n";
    s += `${MARGIN_LEFT + 280} ${PAGE_HEIGHT - 92} Td\n`;
    s += `(${escapePdfText(`Gestión: ${gestionTexto}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Fecha examen: ${fechaExamen}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Total observaciones: ${incidencias.length}`)}) Tj\n`;
    s += `0 -13 Td\n`;
    s += `(${escapePdfText(`Generado: ${fechaGeneracionStr} ${horaGeneracionStr} por ${generadoPor}`)}) Tj\n`;
    s += "ET\n";

    // Encabezado de la tabla (Criterio 12 y 25)
    const tableTopY = PAGE_HEIGHT - 165;
    s += "q\n";
    s += "0 0.215 0.439 rg\n";
    s += `${MARGIN_LEFT} ${tableTopY - 18} ${MARGIN_RIGHT - MARGIN_LEFT} 18 re f\n`;
    s += "Q\n";

    s += "BT\n";
    s += "/F2 8 Tf\n";
    s += "1 1 1 rg\n";
    s += `${MARGIN_LEFT + 6} ${tableTopY - 12} Td\n`;
    s += `(${escapePdfText("HORA")}) Tj\n`;
    s += `50 0 Td\n`;
    s += `(${escapePdfText("CODIGO SIS")}) Tj\n`;
    s += `70 0 Td\n`;
    s += `(${escapePdfText("ESTUDIANTE")}) Tj\n`;
    s += `190 0 Td\n`;
    s += `(${escapePdfText("MOTIVO")}) Tj\n`;
    s += `110 0 Td\n`;
    s += `(${escapePdfText("REGISTRADO POR")}) Tj\n`;
    s += "ET\n";

    let currentY = tableTopY - 18;

    if (rows.length === 0) {
      s += "BT\n";
      s += "/F1 9 Tf\n";
      s += "0.5 0.5 0.5 rg\n";
      s += `${MARGIN_LEFT + 140} ${currentY - 25} Td\n`;
      s += `(${escapePdfText("No se registraron observaciones con los filtros seleccionados.")}) Tj\n`;
      s += "ET\n";
    } else {
      rows.forEach((inc, idx) => {
        const rowHeight = 16;
        currentY -= rowHeight;

        // Alternancia sutil de color de fila
        if (idx % 2 === 1) {
          s += "q\n";
          s += "0.97 0.98 0.99 rg\n";
          s += `${MARGIN_LEFT} ${currentY} ${MARGIN_RIGHT - MARGIN_LEFT} ${rowHeight} re f\n`;
          s += "Q\n";
        }

        // Línea divisoria horizontal suave
        s += "q\n";
        s += "0.9 0.9 0.9 RG\n";
        s += "0.5 w\n";
        s += `${MARGIN_LEFT} ${currentY} m ${MARGIN_RIGHT} ${currentY} l S\n`;
        s += "Q\n";

        const hora = inc.fechaHora
          ? new Date(inc.fechaHora).toLocaleTimeString("es-BO", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const sis = inc.codigoSis || "–";
        const estudiante = inc.estudianteNombre || "–";
        const motivoLabel = getMotivoLabel(inc.motivo);
        const registradoPor = inc.registradoPor || "Sistema";

        s += "BT\n";
        s += "/F1 7.5 Tf\n";
        s += "0.15 0.15 0.15 rg\n";

        // Hora
        s += `${MARGIN_LEFT + 6} ${currentY + 4} Td\n`;
        s += `(${escapePdfText(hora)}) Tj\n`;

        // SIS
        s += `50 0 Td\n`;
        s += `(${escapePdfText(sis)}) Tj\n`;

        // Estudiante (truncado seguro si es muy largo)
        s += `70 0 Td\n`;
        const estTruncado =
          estudiante.length > 34 ? `${estudiante.slice(0, 32)}...` : estudiante;
        s += `(${escapePdfText(estTruncado)}) Tj\n`;

        // Motivo
        s += `190 0 Td\n`;
        s += `(${escapePdfText(motivoLabel)}) Tj\n`;

        // Registrado por
        s += `110 0 Td\n`;
        const regTruncado =
          registradoPor.length > 20
            ? `${registradoPor.slice(0, 18)}...`
            : registradoPor;
        s += `(${escapePdfText(regTruncado)}) Tj\n`;

        s += "ET\n";
      });
    }

    // Pie de página con numeración "Página X de Y"
    s += "q\n";
    s += "0.85 0.85 0.85 RG\n";
    s += "0.5 w\n";
    s += `${MARGIN_LEFT} 38 m ${MARGIN_RIGHT} 38 l S\n`;
    s += "Q\n";

    s += "BT\n";
    s += "/F1 8 Tf\n";
    s += "0.5 0.5 0.5 rg\n";
    s += `${MARGIN_LEFT} 26 Td\n`;
    s += `(${escapePdfText("SULLU - Sistema de Control y Asistencia")}) Tj\n`;
    s += "ET\n";

    s += "BT\n";
    s += "/F1 8 Tf\n";
    s += "0.5 0.5 0.5 rg\n";
    s += `${MARGIN_RIGHT - 65} 26 Td\n`;
    s += `(${escapePdfText(`Pagina ${pageIdx + 1} de ${totalPages}`)}) Tj\n`;
    s += "ET\n";

    const streamLength = Buffer.byteLength(s, "utf-8");
    const streamObj = `${contentStreamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${s}\nendstream\nendobj\n`;
    objects.push({ num: contentStreamObjNum, content: streamObj });

    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentStreamObjNum} 0 R /Resources << /Font << /F1 100 0 R /F2 101 0 R >> >> >>\nendobj\n`;
    objects.push({ num: pageObjNum, content: pageObj });
  }

  // Objeto de fuentes integradas
  const fontObj1 = `100 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
  const fontObj2 = `101 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;
  objects.push({ num: 100, content: fontObj1 });
  objects.push({ num: 101, content: fontObj2 });

  // Objeto Catalog (1 0 obj) y Pages (2 0 obj)
  const kidsStr = pageObjectNumbers.map((n) => `${n} 0 R`).join(" ");
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${totalPages} >>\nendobj\n`;
  const catalogObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  objects.unshift({ num: 2, content: pagesObj });
  objects.unshift({ num: 1, content: catalogObj });

  // Ordenamos objetos por número
  objects.sort((a, b) => a.num - b.num);

  let pdfContent = "%PDF-1.4\n";
  const xrefOffsets: number[] = [0];

  for (const obj of objects) {
    xrefOffsets[obj.num] = Buffer.byteLength(pdfContent, "utf-8");
    pdfContent += obj.content;
  }

  const startxref = Buffer.byteLength(pdfContent, "utf-8");
  const maxObjNum = Math.max(...objects.map((o) => o.num));
  pdfContent += `xref\n0 ${maxObjNum + 1}\n`;
  pdfContent += "0000000000 65535 f \n";

  for (let i = 1; i <= maxObjNum; i++) {
    const offset = xrefOffsets[i] || 0;
    const padded = String(offset).padStart(10, "0");
    pdfContent += `${padded} 00000 n \n`;
  }

  pdfContent += `trailer\n<< /Size ${maxObjNum + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return new Blob([Buffer.from(pdfContent, "utf-8")], {
    type: "application/pdf",
  });
}
