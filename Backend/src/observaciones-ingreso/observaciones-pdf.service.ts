import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

export interface ObservacionPdfFila {
  hora: string;
  codigoSis: string;
  estudiante: string;
  motivo: string;
  registradoPor: string;
}

export interface ExamenPdfGrupo {
  materia: string;
  examen: string;
  carrera: string;
  facultad: string;
  docente: string;
  ambiente: string;
  fechaExamen: string;
  horario: string;
  totalExamen: number;
  filas: ObservacionPdfFila[];
}

export interface ObservacionesPdfData {
  facultadFiltro?: string;
  carreraFiltro?: string;
  docenteFiltro?: string;
  materiaFiltro?: string;
  gestionFiltro?: string;
  examenFiltro?: string;
  motivoFiltro?: string;
  filtros?: string;
  total: number;
  grupos?: ExamenPdfGrupo[];
  // Campos de compatibilidad para reporte de un solo examen
  materia?: string;
  examen?: string;
  carrera?: string;
  facultad?: string;
  ambiente?: string;
  fechaExamen?: string;
  horario?: string;
  filas?: ObservacionPdfFila[];
  generadoPor: string;
  generadoEn: string;
}

function buscarRutaLogo(nombre: string): string | null {
  const posiblesRutas = [
    path.resolve(process.cwd(), '../Frontend/public', nombre),
    path.resolve(process.cwd(), 'Frontend/public', nombre),
    path.resolve(process.cwd(), 'public', nombre),
    path.resolve(__dirname, '../../Frontend/public', nombre),
  ];
  for (const ruta of posiblesRutas) {
    if (fs.existsSync(ruta)) {
      return ruta;
    }
  }
  return null;
}

@Injectable()
export class ObservacionesPdfService {
  /**
   * Genera el PDF del reporte oficial de observaciones de ingreso en memoria.
   * Soporta observaciones agrupadas por examen y ordenadas institucionalmente.
   */
  async generar(data: ObservacionesPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 35, bottom: 40, left: 35, right: 35 },
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) =>
          reject(
            new InternalServerErrorException(
              'Error al generar el documento PDF',
              { cause: err },
            ),
          ),
        );

        const printableWidth = doc.page.width - 70; // 612 - 70 = 542
        const startX = 35;

        // Normalizar grupos para compatibilidad
        const grupos: ExamenPdfGrupo[] =
          data.grupos && data.grupos.length > 0
            ? data.grupos
            : [
                {
                  materia: data.materia ?? 'Materia',
                  examen: data.examen ?? 'Examen',
                  carrera: data.carrera ?? 'Carrera',
                  facultad:
                    data.facultad ?? 'Facultad de Ciencias y Tecnología',
                  docente: data.generadoPor ?? '',
                  ambiente: data.ambiente ?? 'Ambiente no asignado',
                  fechaExamen: data.fechaExamen ?? '',
                  horario: data.horario ?? '',
                  totalExamen: data.total ?? data.filas?.length ?? 0,
                  filas: data.filas ?? [],
                },
              ];

        // 1. Encabezado institucional
        this.dibujarEncabezadoInstitucional(doc, startX, printableWidth);

        // 2. Ficha de filtros aplicados y metadatos
        let currentY = 115;
        currentY = this.dibujarFichaFiltros(
          doc,
          startX,
          currentY,
          printableWidth,
          data,
        );

        // 3. Tablas agrupadas por examen
        this.dibujarGruposExamen(
          doc,
          startX,
          currentY,
          printableWidth,
          grupos,
          data.total,
        );

        // 4. Pie de página institucional y numeración en todas las páginas
        this.aplicarPieDePagina(doc, data.generadoEn);

        doc.end();
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new InternalServerErrorException(
                'Error inesperado al construir el reporte PDF',
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
    // Franja superior institucional
    doc.rect(startX, 24, width, 4).fill('#0f2c59');
    doc.rect(startX, 28, width, 1.5).fill('#b91c1c');

    // Cargar logos de manera protegida (criterio 21: si falla, no afecta generación)
    try {
      const rutaLogoUmss = buscarRutaLogo('LogoUMSS.png');
      if (rutaLogoUmss) {
        doc.image(rutaLogoUmss, startX + 2, 33, { width: 34, height: 42 });
      }
    } catch {
      // Ignorar si el logo no está disponible
    }

    try {
      const rutaLogoSistema = buscarRutaLogo('LogoExaControl.png');
      if (rutaLogoSistema) {
        doc.image(rutaLogoSistema, startX + width - 42, 36, {
          width: 40,
          height: 38,
        });
      }
    } catch {
      // Ignorar si el logo no está disponible
    }

    doc
      .fillColor('#0f2c59')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text('UNIVERSIDAD MAYOR DE SAN SIMÓN', startX, 33, {
        align: 'center',
        width,
      });

    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('FACULTAD DE CIENCIAS Y TECNOLOGÍA', startX, 46, {
        align: 'center',
        width,
      });

    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(7)
      .text(
        'SULLU — SISTEMA INTEGRAL DE CONTROL DE ASISTENCIA A EXÁMENES',
        startX,
        58,
        { align: 'center', width },
      );

    doc
      .fillColor('#0f2c59')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('REPORTE DE OBSERVACIONES DE INGRESO', startX, 72, {
        align: 'center',
        width,
      });

    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.8)
      .moveTo(startX, 94)
      .lineTo(startX + width, 94)
      .stroke();
  }

  private dibujarFichaFiltros(
    doc: PDFKit.PDFDocument,
    startX: number,
    startY: number,
    width: number,
    data: ObservacionesPdfData,
  ): number {
    const cardHeight = 62;

    doc
      .rect(startX, startY, width, cardHeight)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    const col1X = startX + 10;
    const col2X = startX + width / 3 + 10;
    const col3X = startX + (2 * width) / 3 + 10;
    const colWidth = width / 3 - 15;

    const lineaY1 = startY + 7;
    const lineaY2 = startY + 20;
    const lineaY3 = startY + 33;
    const lineaY4 = startY + 46;

    // Columna 1
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY1,
      colWidth,
      'Facultad:',
      data.facultadFiltro || data.facultad || 'Todas',
    );
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY2,
      colWidth,
      'Carrera:',
      data.carreraFiltro || data.carrera || 'Todas',
    );
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY3,
      colWidth,
      'Docente:',
      data.docenteFiltro || 'Todos',
    );
    this.imprimirEtiquetaValor(
      doc,
      col1X,
      lineaY4,
      colWidth,
      'Materia:',
      data.materiaFiltro || data.materia || 'Todas',
    );

    // Columna 2
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY1,
      colWidth,
      'Gestión:',
      data.gestionFiltro || 'Gestión vigente',
    );
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY2,
      colWidth,
      'Examen:',
      data.examenFiltro || data.examen || 'Todos',
    );
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY3,
      colWidth,
      'Motivo:',
      data.motivoFiltro || 'Todos los motivos',
    );
    this.imprimirEtiquetaValor(
      doc,
      col2X,
      lineaY4,
      colWidth,
      'Total Obs.:',
      String(data.total),
    );

    // Columna 3 (Metadatos del servidor)
    this.imprimirEtiquetaValor(
      doc,
      col3X,
      lineaY1,
      colWidth,
      'Generado por:',
      data.generadoPor,
    );
    this.imprimirEtiquetaValor(
      doc,
      col3X,
      lineaY2,
      colWidth,
      'Fecha / Hora:',
      data.generadoEn,
    );

    return startY + cardHeight + 14;
  }

  private imprimirEtiquetaValor(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    etiqueta: string,
    valor: string,
  ) {
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.2);
    const etiquetaAncho = doc.widthOfString(etiqueta + ' ');
    doc.text(etiqueta, x, y, { lineBreak: false });

    doc
      .fillColor('#0f172a')
      .font('Helvetica')
      .fontSize(7.2)
      .text(valor, x + etiquetaAncho, y, {
        width: width - etiquetaAncho,
        lineBreak: false,
        ellipsis: true,
      });
  }

  private dibujarGruposExamen(
    doc: PDFKit.PDFDocument,
    startX: number,
    startY: number,
    width: number,
    grupos: ExamenPdfGrupo[],
    totalGeneral: number,
  ) {
    const columnas = [
      { key: 'hora', titulo: 'HORA', width: 55, align: 'center' as const },
      { key: 'sis', titulo: 'CÓDIGO SIS', width: 75, align: 'center' as const },
      {
        key: 'estudiante',
        titulo: 'ESTUDIANTE',
        width: 175,
        align: 'left' as const,
      },
      { key: 'motivo', titulo: 'MOTIVO', width: 120, align: 'center' as const },
      {
        key: 'registradoPor',
        titulo: 'REGISTRADO POR',
        width: 117,
        align: 'left' as const,
      },
    ];

    const headerHeight = 17;
    const rowHeight = 16;
    const maxY = doc.page.height - 48;

    let currentY = startY;

    const dibujarHeaderTabla = (y: number) => {
      doc.rect(startX, y, width, headerHeight).fill('#1e293b');

      let colX = startX;
      columnas.forEach((col) => {
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(6.8)
          .text(col.titulo, colX + 4, y + 5, {
            width: col.width - 8,
            align: col.align,
          });
        colX += col.width;
      });

      return y + headerHeight;
    };

    for (const grupo of grupos) {
      // Cabecera del examen agrupado (materia, carrera, fecha, ambiente, horario, docente)
      const groupHeaderHeight = 30;
      if (currentY + groupHeaderHeight + headerHeight + rowHeight > maxY) {
        doc.addPage();
        currentY = 40;
      }

      doc
        .rect(startX, currentY, width, groupHeaderHeight)
        .fillAndStroke('#eff6ff', '#bfdbfe');

      doc
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`${grupo.materia} — ${grupo.examen}`, startX + 8, currentY + 5, {
          width: width - 16,
          lineBreak: false,
          ellipsis: true,
        });

      const detalleExamen = `${grupo.facultad} | ${grupo.carrera} | Docente: ${grupo.docente} | Fecha: ${grupo.fechaExamen} | ${grupo.ambiente} (${grupo.horario}) | Obs: ${grupo.totalExamen}`;
      doc
        .fillColor('#3b82f6')
        .font('Helvetica')
        .fontSize(7)
        .text(detalleExamen, startX + 8, currentY + 17, {
          width: width - 16,
          lineBreak: false,
          ellipsis: true,
        });

      currentY += groupHeaderHeight + 2;
      currentY = dibujarHeaderTabla(currentY);

      if (grupo.filas.length === 0) {
        doc
          .rect(startX, currentY, width, 22)
          .fillAndStroke('#ffffff', '#e2e8f0');
        doc
          .fillColor('#64748b')
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .text(
            'Sin observaciones registradas para este examen.',
            startX,
            currentY + 6,
            { align: 'center', width },
          );
        currentY += 24;
        continue;
      }

      grupo.filas.forEach((f, idx) => {
        if (currentY + rowHeight > maxY) {
          doc.addPage();
          currentY = dibujarHeaderTabla(40);
        }

        const esPar = idx % 2 === 0;
        doc
          .rect(startX, currentY, width, rowHeight)
          .fillAndStroke(esPar ? '#ffffff' : '#f8fafc', '#f1f5f9');

        let colX = startX;

        // 1. Hora
        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(7)
          .text(f.hora, colX + 2, currentY + 4, {
            width: columnas[0].width - 4,
            align: columnas[0].align,
          });
        colX += columnas[0].width;

        // 2. SIS
        doc
          .fillColor('#0f172a')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(f.codigoSis, colX + 2, currentY + 4, {
            width: columnas[1].width - 4,
            align: columnas[1].align,
          });
        colX += columnas[1].width;

        // 3. Estudiante
        doc
          .fillColor('#0f172a')
          .font('Helvetica')
          .fontSize(7)
          .text(f.estudiante, colX + 6, currentY + 4, {
            width: columnas[2].width - 12,
            align: columnas[2].align,
            lineBreak: false,
            ellipsis: true,
          });
        colX += columnas[2].width;

        // 4. Motivo (etiqueta roja acorde a especificación HU18)
        doc
          .fillColor('#dc2626')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(f.motivo, colX + 2, currentY + 4, {
            width: columnas[3].width - 4,
            align: columnas[3].align,
            lineBreak: false,
            ellipsis: true,
          });
        colX += columnas[3].width;

        // 5. Registrado por
        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(7)
          .text(f.registradoPor, colX + 6, currentY + 4, {
            width: columnas[4].width - 12,
            align: columnas[4].align,
            lineBreak: false,
            ellipsis: true,
          });

        currentY += rowHeight;
      });

      currentY += 8; // Espacio entre exámenes
    }

    // Fila resumen total general coincidente con la vista
    if (currentY + 22 > maxY) {
      doc.addPage();
      currentY = 40;
    }

    doc.rect(startX, currentY, width, 20).fillAndStroke('#f1f5f9', '#cbd5e1');

    doc
      .fillColor('#0f2c59')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(
        `TOTAL GENERAL: ${totalGeneral} OBSERVACIONES`,
        startX + 10,
        currentY + 6,
        {
          width: width - 20,
          align: 'right',
        },
      );
  }

  private aplicarPieDePagina(doc: PDFKit.PDFDocument, fechaGeneracion: string) {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);

      const y = doc.page.height - 28;
      const width = doc.page.width - 70;

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(0.5)
        .moveTo(35, y - 5)
        .lineTo(35 + width, y - 5)
        .stroke();

      doc
        .fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(6.5)
        .text(
          `SULLU Sistema de Control de Asistencia • Generado por el servidor el ${fechaGeneracion}`,
          35,
          y,
          { width: width / 2, align: 'left' },
        );

      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text(`Página ${i + 1} de ${totalPages}`, 35 + width / 2, y, {
          width: width / 2,
          align: 'right',
        });
    }
  }
}
