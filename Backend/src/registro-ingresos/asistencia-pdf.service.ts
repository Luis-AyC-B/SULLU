import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ReporteEstudianteItem {
  numero: number;
  codSis: string;
  estudiante: string;
  habilitado: boolean;
  asistio: boolean;
  horaIngreso: string;
  metodo: string;
}

export interface ReporteAsistenciaPdfData {
  examenId: number;
  materia: string;
  tipoExamen: string;
  carrera: string;
  docente: string;
  ambiente: string;
  fecha: string;
  horario: string;
  totalHabilitados: number;
  totalPresentes: number;
  totalAusentes: number;
  porcentajeAsistencia: number;
  fechaGeneracion: string;
  estudiantes: ReporteEstudianteItem[];
}

@Injectable()
export class AsistenciaPdfService {
  /**
   * Genera el documento PDF en memoria y retorna su contenido como Buffer binario.
   */
  async generarPdf(data: ReporteAsistenciaPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 40, bottom: 45, left: 40, right: 40 },
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const printableWidth = doc.page.width - 80; // 612 - 80 = 532
        const startX = 40;

        // 1. Encabezado institucional
        this.dibujarEncabezadoInstitucional(doc, startX, printableWidth);

        // 2. Ficha técnica del examen
        let currentY = 120;
        currentY = this.dibujarFichaExamen(
          doc,
          startX,
          currentY,
          printableWidth,
          data,
        );

        // 3. Tarjetas de métricas / resumen estadístico
        currentY = this.dibujarMetricas(
          doc,
          startX,
          currentY,
          printableWidth,
          data,
        );

        // 4. Tabla de asistencia de estudiantes
        this.dibujarTablaAsistencia(
          doc,
          startX,
          currentY,
          printableWidth,
          data,
        );

        // 5. Pie de página en todas las páginas generadas
        this.aplicarPieDePagina(doc, data.fechaGeneracion);

        doc.end();
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(
                typeof error === 'string'
                  ? error
                  : 'Error al generar el reporte PDF',
              ),
        );
      }
    });
  }

  private dibujarEncabezadoInstitucional(
    doc: PDFKit.PDFDocument,
    startX: number,
    width: number,
  ) {
    // Franja superior institucional decorativa
    doc.rect(startX, 30, width, 4).fill('#0f2c59');
    doc.rect(startX, 34, width, 1.5).fill('#b91c1c');

    doc
      .fillColor('#0f2c59')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('UNIVERSIDAD MAYOR DE SAN SIMÓN', startX, 42, {
        align: 'center',
        width,
      });

    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('FACULTAD DE CIENCIAS Y TECNOLOGÍA', startX, 57, {
        align: 'center',
        width,
      });

    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        'SULLU — SISTEMA INTEGRAL DE CONTROL DE ASISTENCIA A EXÁMENES',
        startX,
        70,
        { align: 'center', width },
      );

    doc
      .fillColor('#0f2c59')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('REPORTE OFICIAL DE ASISTENCIA A EXAMEN', startX, 86, {
        align: 'center',
        width,
      });

    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.8)
      .moveTo(startX, 105)
      .lineTo(startX + width, 105)
      .stroke();
  }

  private dibujarFichaExamen(
    doc: PDFKit.PDFDocument,
    startX: number,
    startY: number,
    width: number,
    data: ReporteAsistenciaPdfData,
  ): number {
    const cardHeight = 62;

    // Fondo y borde de la ficha técnica
    doc
      .rect(startX, startY, width, cardHeight)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    const col1X = startX + 12;
    const col2X = startX + width / 2 + 10;
    const colWidth = width / 2 - 20;

    const lineaY1 = startY + 8;
    const lineaY2 = startY + 23;
    const lineaY3 = startY + 38;

    // Columna Izquierda
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY1,
      colWidth,
      'Materia:',
      data.materia,
    );
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY2,
      colWidth,
      'Carrera:',
      data.carrera,
    );
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY3,
      colWidth,
      'Docente:',
      data.docente,
    );

    // Columna Derecha
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY1,
      colWidth,
      'Tipo Examen:',
      data.tipoExamen,
    );
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY2,
      colWidth,
      'Ambiente:',
      data.ambiente,
    );
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY3,
      colWidth,
      'Fecha y Hora:',
      `${data.fecha}  (${data.horario})`,
    );

    return startY + cardHeight + 10;
  }

  private imprimirEtiquetaValor(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    _width: number,
    label: string,
    value: string,
  ) {
    doc
      .fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(label, x, y, {
        continued: true,
      });
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(`  ${value}`);
  }

  private dibujarMetricas(
    doc: PDFKit.PDFDocument,
    startX: number,
    startY: number,
    width: number,
    data: ReporteAsistenciaPdfData,
  ): number {
    const metricas = [
      {
        titulo: 'HABILITADOS',
        valor: String(data.totalHabilitados),
        subtexto: '100% estudiantes',
        color: '#0284c7',
        bg: '#f0f9ff',
      },
      {
        titulo: 'PRESENTES',
        valor: String(data.totalPresentes),
        subtexto: `${data.porcentajeAsistencia}% asistencia`,
        color: '#16a34a',
        bg: '#f0fdf4',
      },
      {
        titulo: 'AUSENTES',
        valor: String(data.totalAusentes),
        subtexto: `${Math.max(0, 100 - data.porcentajeAsistencia)}% inasistencia`,
        color: '#dc2626',
        bg: '#fef2f2',
      },
      {
        titulo: 'EFECTIVIDAD',
        valor: `${data.porcentajeAsistencia}%`,
        subtexto: 'Asistencia neta',
        color: '#7c3aed',
        bg: '#faf5ff',
      },
    ];

    const gap = 8;
    const cardWidth = (width - gap * 3) / 4;
    const cardHeight = 44;

    metricas.forEach((m, idx) => {
      const x = startX + idx * (cardWidth + gap);

      doc.rect(x, startY, cardWidth, cardHeight).fillAndStroke(m.bg, '#e2e8f0');

      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text(m.titulo, x, startY + 6, { width: cardWidth, align: 'center' });

      doc
        .fillColor(m.color)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(m.valor, x, startY + 16, { width: cardWidth, align: 'center' });

      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(6.5)
        .text(m.subtexto, x, startY + 31, {
          width: cardWidth,
          align: 'center',
        });
    });

    return startY + cardHeight + 14;
  }

  private dibujarTablaAsistencia(
    doc: PDFKit.PDFDocument,
    startX: number,
    startY: number,
    width: number,
    data: ReporteAsistenciaPdfData,
  ) {
    const columnas = [
      { key: 'num', titulo: '#', width: 28, align: 'center' as const },
      { key: 'sis', titulo: 'CÓDIGO SIS', width: 72, align: 'center' as const },
      {
        key: 'nombre',
        titulo: 'APELLIDOS Y NOMBRES',
        width: 185,
        align: 'left' as const,
      },
      {
        key: 'habil',
        titulo: 'HABILITACIÓN',
        width: 75,
        align: 'center' as const,
      },
      {
        key: 'estado',
        titulo: 'ASISTENCIA',
        width: 68,
        align: 'center' as const,
      },
      { key: 'hora', titulo: 'HORA', width: 52, align: 'center' as const },
      { key: 'metodo', titulo: 'MÉTODO', width: 52, align: 'center' as const },
    ];

    const headerHeight = 18;
    const rowHeight = 16;
    const maxY = doc.page.height - 50;

    let currentY = startY;

    // Encabezado de la tabla
    const dibujarHeaderTabla = (y: number) => {
      doc.rect(startX, y, width, headerHeight).fill('#1e293b');

      let colX = startX;
      columnas.forEach((col) => {
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(col.titulo, colX + 2, y + 5, {
            width: col.width - 4,
            align: col.align,
          });
        colX += col.width;
      });

      return y + headerHeight;
    };

    currentY = dibujarHeaderTabla(currentY);

    if (data.estudiantes.length === 0) {
      doc.rect(startX, currentY, width, 30).fillAndStroke('#ffffff', '#e2e8f0');
      doc
        .fillColor('#64748b')
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .text(
          'No existen estudiantes registrados para este examen.',
          startX,
          currentY + 10,
          {
            align: 'center',
            width,
          },
        );
      return;
    }

    data.estudiantes.forEach((est, idx) => {
      if (currentY + rowHeight > maxY) {
        doc.addPage();
        currentY = dibujarHeaderTabla(40);
      }

      const esPar = idx % 2 === 0;
      doc
        .rect(startX, currentY, width, rowHeight)
        .fillAndStroke(esPar ? '#ffffff' : '#f8fafc', '#f1f5f9');

      let colX = startX;

      // 1. Número
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(7.5)
        .text(String(est.numero), colX, currentY + 4, {
          width: columnas[0].width,
          align: 'center',
        });
      colX += columnas[0].width;

      // 2. SIS
      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(est.codSis, colX, currentY + 4, {
          width: columnas[1].width,
          align: 'center',
        });
      colX += columnas[1].width;

      // 3. Estudiante (Apellidos y Nombres)
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(7.5)
        .text(est.estudiante, colX + 4, currentY + 4, {
          width: columnas[2].width - 8,
          align: 'left',
          lineBreak: false,
          ellipsis: true,
        });
      colX += columnas[2].width;

      // 4. Habilitación
      doc
        .fillColor(est.habilitado ? '#0284c7' : '#b91c1c')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(
          est.habilitado ? 'Habilitado' : 'Inhabilitado',
          colX,
          currentY + 4,
          {
            width: columnas[3].width,
            align: 'center',
          },
        );
      colX += columnas[3].width;

      // 5. Asistencia (PRESENTE / AUSENTE)
      doc
        .fillColor(est.asistio ? '#15803d' : '#b91c1c')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(est.asistio ? 'PRESENTE' : 'AUSENTE', colX, currentY + 4, {
          width: columnas[4].width,
          align: 'center',
        });
      colX += columnas[4].width;

      // 6. Hora
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(7)
        .text(est.horaIngreso, colX, currentY + 4, {
          width: columnas[5].width,
          align: 'center',
        });
      colX += columnas[5].width;

      // 7. Método
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(7)
        .text(est.metodo, colX, currentY + 4, {
          width: columnas[6].width,
          align: 'center',
        });

      currentY += rowHeight;
    });
  }

  private aplicarPieDePagina(doc: PDFKit.PDFDocument, fechaGeneracion: string) {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);

      // Desactivamos el margen inferior momentáneamente para no disparar un salto de página accidental
      const origBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const y = doc.page.height - 25;
      const width = doc.page.width - 80;

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(0.5)
        .moveTo(40, y - 5)
        .lineTo(40 + width, y - 5)
        .stroke();

      doc
        .fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(6.5)
        .text(
          `SULLU Sistema de Control de Asistencia • Generado el ${fechaGeneracion}`,
          40,
          y,
          { width: width / 2, align: 'left', lineBreak: false },
        );

      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text(`Página ${i + 1} de ${totalPages}`, 40 + width / 2, y, {
          width: width / 2,
          align: 'right',
          lineBreak: false,
        });

      doc.page.margins.bottom = origBottom;
    }
  }
}
