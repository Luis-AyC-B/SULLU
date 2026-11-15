// src/features/registro-ingresos/lib/generarPdfReporteIngresos.ts
import type { ExamenControl, Ingreso } from '../types/ingresos.types';
import { formatHoraIngreso } from '../types/ingresos.types';
import {
  toPascalCase,
  obtenerNombreMateria,
  obtenerNombreParcial,
  formatearNombreArchivoReporte,
} from './formatoReporteUtils';

export * from './formatoReporteUtils';

export interface GenerarPdfParams {
  examen: ExamenControl;
  examenesLista?: ExamenControl[];
  ingresos: Ingreso[];
  ingresados: number;
  total: number;
  docenteNombre?: string;
  fechaGeneracion?: Date;
  filtrosAplicados?: {
    facultad?: string;
    carrera?: string;
    docente?: string;
    gestion?: string;
    materia?: string;
    examen?: string;
  };
}

interface Imagen {
  data: string;
  w: number;
  h: number;
}

async function cargarImagen(url: string): Promise<Imagen | null> {
  if (typeof window === 'undefined') return null;
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
      img.onerror = () => fallo(new Error('Imagen inválida'));
      img.src = data;
    });
    return { data, ...dim };
  } catch {
    return null;
  }
}

function codigoDocumento(ingresos: Ingreso[], ahora: string): string {
  const texto = ingresos
    .map(
      (i) =>
        `${i.hora}|${i.sis}|${i.estudiante}|${i.metodo}|${i.estado}|${i.casoExcepcional ?? ''}`
    )
    .join('\n');
  let h = 5381;
  for (let k = 0; k < texto.length; k++) {
    h = ((h << 5) + h + texto.charCodeAt(k)) >>> 0;
  }
  const dia = ahora.slice(0, 10).replace(/-/g, '');
  return `RPT-${dia}-${h.toString(16).toUpperCase().padStart(8, '0')}`;
}

const MARGEN = 14;
const ALTO_ENCABEZADO = 22;
const ALTO_PIE = 24;
const AZUL: [number, number, number] = [0, 45, 98]; // #002D62
const ROJO: [number, number, number] = [227, 6, 19]; // #E30613

/**
 * Genera el documento PDF oficial de asistencia en formato institucional ExaControl (Landscape)
 */
export async function generarPdfReporteIngresos({
  examen,
  ingresos,
  ingresados,
  total,
  docenteNombre = 'Docente titular',
  fechaGeneracion = new Date(),
  filtrosAplicados,
}: GenerarPdfParams): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const [logoUmss, logoExa] = await Promise.all([
    cargarImagen('/LogoUMSSDarkMode.png'),
    cargarImagen('/LogoExaControlSinNombre.png'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const ahora = fechaGeneracion.toISOString();
  const codigo = codigoDocumento(ingresos, ahora);

  const materia = filtrosAplicados?.materia || obtenerNombreMateria(examen.nombre);
  const docenteStr = filtrosAplicados?.docente || examen.docente || docenteNombre;

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

  function dibujarEncabezado() {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, ancho, ALTO_ENCABEZADO, 'F');
    doc.setFillColor(...ROJO);
    doc.rect(0, ALTO_ENCABEZADO, ancho, 0.8, 'F');

    let x = MARGEN;
    if (logoUmss) {
      const h = 12;
      const w = (h * logoUmss.w) / logoUmss.h;
      doc.addImage(logoUmss.data, 'PNG', x, (ALTO_ENCABEZADO - h) / 2, w, h);
      x += w + 8;
    }
    if (logoExa) {
      const h = 9;
      const w = (h * logoExa.w) / logoExa.h;
      doc.addImage(logoExa.data, 'PNG', x, (ALTO_ENCABEZADO - h) / 2, w, h);
      x += w + 2;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...ROJO);
    doc.text('ExaControl', x, ALTO_ENCABEZADO / 2 + 2);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Universidad Mayor de San Simón', ancho - MARGEN, ALTO_ENCABEZADO / 2 + 1.5, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  const lineas = [
    `Examen: ${examen.nombre}`,
    `Materia: ${materia}`,
    `Docente: ${docenteStr}`,
    `Generado: ${fechaGeneracionStr} ${horaGeneracionStr} por ${docenteStr}`,
    `Total de ingresados: ${ingresados} de ${total}`,
    `Código de documento: ${codigo}`,
  ];

  const yTitulo = ALTO_ENCABEZADO + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...AZUL);
  doc.text('Reporte oficial de asistencia', MARGEN, yTitulo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  lineas.forEach((l, i) => doc.text(l, MARGEN, yTitulo + 8 + i * 5));

  autoTable(doc, {
    startY: yTitulo + 8 + lineas.length * 5 + 2,
    margin: { top: ALTO_ENCABEZADO + 8, bottom: ALTO_PIE, left: MARGEN, right: MARGEN },
    head: [
      ['#', 'Hora', 'Código SIS', 'Estudiante', 'Método', 'Estado', 'Caso excepcional'],
    ],
    body: ingresos.map((ing, idx) => [
      String(idx + 1),
      formatHoraIngreso(ing.hora),
      ing.sis,
      ing.estudiante,
      ing.metodo || 'Manual',
      ing.estado || 'Habilitado',
      ing.casoExcepcional && ing.casoExcepcional.trim() ? ing.casoExcepcional.trim() : '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold' },
    didDrawPage: () => dibujarEncabezado(),
  });

  const advertencia =
    'Documento oficial generado por ExaControl, Universidad Mayor de San Simón (UMSS). ' +
    'Su contenido es confidencial y de uso institucional. Cualquier alteración, adulteración o ' +
    'reproducción no autorizada invalida este reporte y puede ser sancionada conforme a la ' +
    'normativa universitaria y legal vigente. Verifique su autenticidad con el código de documento.';
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, alto - 19, ancho - MARGEN, alto - 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize(advertencia, ancho - MARGEN * 2 - 30), MARGEN, alto - 15);
    doc.text(`Página ${p} de ${paginas}`, ancho - MARGEN, alto - 8, { align: 'right' });
    doc.text(codigo, MARGEN, alto - 8);
  }

  return doc.output('blob') as Blob;
}
