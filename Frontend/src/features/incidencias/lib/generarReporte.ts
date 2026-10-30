import {
  ETIQUETA_MOTIVO_EXPULSION,
  formatearHoraIncidencia,
  type ExamenExpulsion,
  type Incidencia,
} from "../types/incidencias.types";
import type { FiltrosReporte } from "./filtrarReporte";

const dos = (n: number) => String(n).padStart(2, "0");

const MARGEN = 14;
const ALTO_ENCABEZADO = 22;
const ALTO_PIE = 24;
const AZUL: [number, number, number] = [0, 45, 98]; // #002D62
const ROJO: [number, number, number] = [227, 6, 19]; // #E30613

function formatearFecha(iso: string): string {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return "--/--/----";
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`;
}

interface Imagen {
  data: string;
  w: number;
  h: number;
}

async function cargarImagen(url: string): Promise<Imagen | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((ok, fallo) => {
      const r = new FileReader();
      r.onload = () => ok(r.result as string);
      r.onerror = () => fallo(r.error);
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((ok, fallo) => {
      const img = new Image();
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => fallo(new Error("Imagen inválida"));
      img.src = data;
    });
    return { data, ...dim };
  } catch {
    return null; // si falta un logo, el reporte se genera igual
  }
}

// Código corto derivado del contenido: si alguien edita los datos, cambia.
function codigoDocumento(incidencias: Incidencia[], ahora: string): string {
  const texto = incidencias
    .map((i) => `${i.fechaHora}|${i.codigoSis}|${i.motivo}|${i.detalle}`)
    .join("\n");
  let h = 5381;
  for (let k = 0; k < texto.length; k++) {
    h = ((h << 5) + h + texto.charCodeAt(k)) >>> 0;
  }
  const dia = ahora.slice(0, 10).replace(/-/g, "");
  return `RPT-${dia}-${h.toString(16).toUpperCase().padStart(8, "0")}`;
}

interface Parametros {
  examen: ExamenExpulsion;
  incidencias: Incidencia[];
  filtros: FiltrosReporte;
  generadoPor?: string;
}

export async function generarReportePdf({
  examen,
  incidencias,
  filtros,
  generadoPor,
}: Parametros): Promise<void> {
  // Import dinámico: jspdf solo se descarga al generar el reporte.
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const [logoUmss, logoExa] = await Promise.all([
    cargarImagen("/LogoUMSSDarkMode.png"),
    cargarImagen("/LogoExaControlSinNombre.png"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const ahora = new Date().toISOString();
  const codigo = codigoDocumento(incidencias, ahora);

  function dibujarEncabezado() {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, ancho, ALTO_ENCABEZADO, "F");
    doc.setFillColor(...ROJO);
    doc.rect(0, ALTO_ENCABEZADO, ancho, 0.8, "F");

    let x = MARGEN;
    if (logoUmss) {
      const h = 12;
      const w = (h * logoUmss.w) / logoUmss.h;
      doc.addImage(logoUmss.data, "PNG", x, (ALTO_ENCABEZADO - h) / 2, w, h);
      x += w + 8;
    }
    if (logoExa) {
      const h = 9;
      const w = (h * logoExa.w) / logoExa.h;
      doc.addImage(logoExa.data, "PNG", x, (ALTO_ENCABEZADO - h) / 2, w, h);
      x += w + 2;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...ROJO);
    doc.text("ExaControl", x, ALTO_ENCABEZADO / 2 + 2);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Universidad Mayor de San Simón", ancho - MARGEN, ALTO_ENCABEZADO / 2 + 1.5, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  }

  const lineas = [
    `Examen: ${examen.nombre}`,
    `Motivo: ${
      filtros.motivo === "TODOS"
        ? "Todos"
        : ETIQUETA_MOTIVO_EXPULSION[filtros.motivo]
    }`,
    `Estudiante: ${filtros.estudiante.trim() || "Todos"}`,
    `Generado: ${formatearFecha(ahora)} ${formatearHoraIncidencia(ahora)}${
      generadoPor ? ` por ${generadoPor}` : ""
    }`,
    `Total de incidencias: ${incidencias.length}`,
    `Código de documento: ${codigo}`,
  ];

  const yTitulo = ALTO_ENCABEZADO + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...AZUL);
  doc.text("Reporte de incidencias", MARGEN, yTitulo);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  lineas.forEach((l, i) => doc.text(l, MARGEN, yTitulo + 8 + i * 5));

  autoTable(doc, {
    startY: yTitulo + 8 + lineas.length * 5 + 2,
    margin: { top: ALTO_ENCABEZADO + 8, bottom: ALTO_PIE, left: MARGEN, right: MARGEN },
    head: [
      ["Fecha", "Hora", "Código SIS", "Estudiante", "Motivo", "Detalle", "Registrado por"],
    ],
    body: incidencias.map((i) => [
      formatearFecha(i.fechaHora),
      formatearHoraIncidencia(i.fechaHora),
      i.codigoSis,
      i.estudianteNombre,
      ETIQUETA_MOTIVO_EXPULSION[i.motivo],
      i.detalle,
      i.registradoPor,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: AZUL },
    didDrawPage: () => dibujarEncabezado(),
  });

  // --- Pie en todas las páginas: advertencia + numeración ---
  const advertencia =
    "Documento oficial generado por ExaControl, Universidad Mayor de San Simón (UMSS). " +
    "Su contenido es confidencial y de uso institucional. Cualquier alteración, adulteración o " +
    "reproducción no autorizada invalida este reporte y puede ser sancionada conforme a la " +
    "normativa universitaria y legal vigente. Verifique su autenticidad con el código de documento.";
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, alto - 19, ancho - MARGEN, alto - 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(advertencia, ancho - MARGEN * 2 - 30), MARGEN, alto - 15);
    doc.text(`Página ${p} de ${paginas}`, ancho - MARGEN, alto - 8, { align: "right" });
    doc.text(codigo, MARGEN, alto - 8);
  }

  const nombreArchivo = examen.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  doc.save(`reporte-incidencias-${nombreArchivo}-${ahora.slice(0, 10)}.pdf`);
}