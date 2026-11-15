import type { Prisma } from '@prisma/client';

const nombres: Record<string, string> = {
  CREACION: 'Creación',
  MODIFICACION: 'Modificación',
  ELIMINACION: 'Eliminación',
};
export function nombreAccion(accion: string): string {
  return nombres[accion] ?? accion.replaceAll('_', ' ');
}

export function etiquetaCampo(campo: string): string {
  const etiquetas: Record<string, string> = {
    mes: 'Mes',
    anio: 'Año',
    pagina: 'Página',
    limite: 'Registros por página',
    periodo: 'Periodo',
    respaldo: 'Archivo de respaldo',
    verificado: 'Restauración verificada',
    usuarioId: 'Usuario',
    permiso_id: 'Permiso',
    rol_id: 'Rol',
    modulo_id: 'Módulo',
    id_facultad: 'Facultad',
    id_carrera: 'Carrera',
    id_materia: 'Materia',
    usuario_id: 'Usuario',
    id_usuario: 'Usuario',
    id_colaborador: 'Colaborador',
    id_docente: 'Docente',
    docente_id: 'Docente',
    ambiente_id: 'Ambiente',
    horario_fijo_id: 'Periodo',
    id_tipoAula: 'Tipo de ambiente',
    id_estudiante: 'Estudiante',
    estudiante_id: 'Estudiante',
    id_examen: 'Examen',
    examen_id: 'Examen',
    tabla: 'Tabla',
    accion: 'Acción',
    _datos_protegidos: 'Datos protegidos',
    deleted_at: 'Fecha de baja',
    creado_en: 'Fecha de creación',
    fecha_hora: 'Fecha y hora',
  };
  const texto =
    etiquetas[campo] ??
    campo.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function textoValor(valor: Prisma.JsonValue | undefined): string {
  if (valor === undefined || valor === null) return 'Sin valor';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor))
    return valor.length ? valor.map(textoValor).join('; ') : 'Sin elementos';
  if (typeof valor === 'object')
    return (
      Object.entries(valor)
        .map(([k, v]) => `${etiquetaCampo(k)}: ${textoValor(v)}`)
        .join('; ') || 'Sin datos'
    );
  return String(valor);
}

export function claveRegistro(
  clave: Prisma.JsonValue | null,
  id: number | null,
): string {
  if (clave && typeof clave === 'object' && !Array.isArray(clave)) {
    return (
      Object.entries(clave)
        .map(([k, v]) =>
          k === 'id'
            ? `#${textoValor(v)}`
            : `${etiquetaCampo(k)}: ${textoValor(v)}`,
        )
        .join(' · ') || 'No aplica'
    );
  }
  return id === null ? 'No aplica' : `#${id}`;
}

// PDF 1.4 directo, como HU17. Layout de auditoría; offsets calculados sobre bytes.
export interface FilaDetallePdf {
  campo: string;
  anterior?: string;
  valor: string;
}
export interface EventoAuditoriaPdf {
  id: number;
  fecha: string;
  usuario: string;
  accion: string;
  tabla: string;
  registro: string;
  tituloDetalle: string;
  comparar: boolean;
  filas: FilaDetallePdf[];
}
export interface ReporteAuditoriaPdf {
  periodo: string;
  administrador: string;
  generado: string;
  filtros: string;
  eventos: EventoAuditoriaPdf[];
}

const W = 841.89,
  H = 595.28,
  M = 36;
const ANCHO = W - M * 2,
  FIN = H - 44;
type Color = [number, number, number];
const AZUL: Color = [0, 55 / 255, 112 / 255],
  TEXTO: Color = [0.12, 0.14, 0.17];
const GRIS: Color = [0.37, 0.37, 0.35],
  FONDO: Color = [0.96, 0.96, 0.94];
const BORDE: Color = [0.86, 0.86, 0.85],
  BLANCO: Color = [1, 1, 1];
const anchosHelvetica = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
function normalizar(texto: string): string {
  return texto.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\xFF]/g, '?');
}
function anchoTexto(texto: string, size: number, bold = false): number {
  return [...normalizar(texto)].reduce(
    (total, c) =>
      total +
      (((anchosHelvetica[c.normalize('NFD').charCodeAt(0) - 32] ?? 600) *
        size) /
        1000) *
        (bold ? 1.08 : 1),
    0,
  );
}
export function envolverTexto(
  texto: string,
  ancho: number,
  size: number,
  bold = false,
): string[] {
  const filas: string[] = [];
  let linea = '';
  for (const palabra of normalizar(texto).split(/\s+/)) {
    const propuesta = linea ? `${linea} ${palabra}` : palabra;
    if (anchoTexto(propuesta, size, bold) <= ancho) {
      linea = propuesta;
      continue;
    }
    if (linea) {
      filas.push(linea);
      linea = '';
    }
    for (const c of palabra) {
      if (anchoTexto(linea + c, size, bold) > ancho && linea) {
        filas.push(linea);
        linea = '';
      }
      linea += c;
    }
  }
  filas.push(linea);
  return filas;
}

class DocumentoAuditoria {
  private paginas: string[][] = [];
  private y = 0;
  private readonly columnas = [96, 100, 65, 85, 200, ANCHO - 546];
  private numeroFila = 0;
  private get pagina() {
    return this.paginas[this.paginas.length - 1];
  }
  constructor(private readonly reporte: ReporteAuditoriaPdf) {
    this.nuevaPagina();
  }
  private rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: Color,
    borde = false,
  ) {
    this.pagina.push(
      `q ${color.join(' ')} rg ${BORDE.join(' ')} RG 0.5 w ${x} ${H - y - h} ${w} ${h} re ${borde ? 'B' : 'f'} Q`,
    );
  }
  private texto(
    texto: string,
    x: number,
    y: number,
    size = 9,
    bold = false,
    color: Color = TEXTO,
  ) {
    const seguro = normalizar(texto).replace(/([\\()])/g, '\\$1');
    this.pagina.push(
      `q ${color.join(' ')} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${H - y - size} Td (${seguro}) Tj ET Q`,
    );
  }
  private nuevaPagina() {
    this.paginas.push([]);
    this.rect(0, 0, W, 7, AZUL);
    this.texto('EXACONTROL', M, 25, 19, true, AZUL);
    this.texto('REPORTE DE AUDITORÍA', W - M - 205, 30, 12, true, AZUL);
    if (this.paginas.length === 1) {
      this.texto(
        'Historial de operaciones del sistema',
        M,
        54,
        11,
        false,
        GRIS,
      );
      this.rect(M, 79, ANCHO, 56, FONDO, true);
      this.texto('PERIODO', M + 12, 87, 8, true, GRIS);
      this.texto(this.reporte.periodo, M + 12, 101, 11, true, AZUL);
      this.texto('TOTAL DE OPERACIONES', M + 260, 87, 8, true, GRIS);
      this.texto(
        `Total de operaciones: ${this.reporte.eventos.length}`,
        M + 260,
        102,
        10,
        true,
      );
      this.texto(
        'GENERADO EN HORA DE BOLIVIA (UTC-4)',
        M + 491,
        87,
        8,
        true,
        GRIS,
      );
      this.texto(this.reporte.generado, M + 491, 103, 10);
      this.y = 146;
      for (const linea of envolverTexto(
        `Administrador: ${this.reporte.administrador}`,
        ANCHO,
        9,
      )) {
        this.texto(linea, M, this.y);
        this.y += 12;
      }
      for (const linea of envolverTexto(
        `Filtros: ${this.reporte.filtros}`,
        ANCHO,
        9,
      )) {
        this.texto(linea, M, this.y, 9, false, GRIS);
        this.y += 12;
      }
      this.y += 12;
    } else {
      this.texto(
        `${this.reporte.periodo} · ${this.reporte.eventos.length} operaciones · Hora de Bolivia`,
        M,
        56,
        9,
        false,
        GRIS,
      );
      this.y = 82;
    }
    this.cabeceraListado();
  }
  private cabecera(titulos: string[], anchos: number[], x = M, oscura = false) {
    anchos.forEach((ancho, i) => {
      this.rect(x, this.y, ancho, 23, oscura ? AZUL : FONDO, !oscura);
      this.texto(
        titulos[i],
        x + 8,
        this.y + 7,
        8,
        true,
        oscura ? BLANCO : AZUL,
      );
      x += ancho;
    });
    this.y += 23;
  }
  private cabeceraListado() {
    this.cabecera(
      [
        'FECHA / OPERACIÓN',
        'RESPONSABLE',
        'ACCIÓN',
        'TABLA',
        'REGISTRO AFECTADO',
        'DETALLE',
      ],
      this.columnas,
      M,
      true,
    );
  }
  evento(evento: EventoAuditoriaPdf) {
    const detalle = evento.comparar
      ? evento.filas.map(
          (fila) =>
            `${fila.campo}: ${fila.anterior ?? 'Sin valor'} => ${fila.valor}`,
        )
      : [
          evento.accion === 'Creación'
            ? 'Registro creado.'
            : 'Registro eliminado.',
        ];
    const celdas = [
      [`${evento.fecha}`, `Operación #${evento.id}`],
      [evento.usuario],
      [evento.accion],
      [evento.tabla],
      [evento.registro],
      detalle.length ? detalle : ['Sin cambios de campos.'],
    ].map((parrafos, i) =>
      parrafos.flatMap((p) => envolverTexto(p, this.columnas[i] - 12, 8)),
    );
    const cantidad = Math.max(...celdas.map((c) => c.length));
    const alturaTotal = cantidad * 10 + 12;
    // Una fila normal se mantiene entera; las extraordinarias continúan sin perder datos.
    if (this.y + Math.min(alturaTotal, 80) > FIN) this.nuevaPagina();
    if (this.y + alturaTotal > FIN && alturaTotal <= FIN - 110)
      this.nuevaPagina();
    let desde = 0;
    while (desde < cantidad) {
      let disponibles = Math.floor((FIN - this.y - 12) / 10);
      if (disponibles < 1) {
        this.nuevaPagina();
        disponibles = Math.floor((FIN - this.y - 12) / 10);
      }
      const trozo = Math.min(cantidad - desde, disponibles);
      const altura = trozo * 10 + 12;
      let x = M;
      this.columnas.forEach((ancho, i) => {
        this.rect(
          x,
          this.y,
          ancho,
          altura,
          this.numeroFila % 2 ? FONDO : BLANCO,
          true,
        );
        const contenido = celdas[i].slice(desde, desde + trozo);
        if (desde > 0 && i === 0)
          contenido.splice(0, contenido.length, `#${evento.id} (cont.)`);
        contenido.forEach((linea, j) =>
          this.texto(linea, x + 6, this.y + 6 + j * 10, 8),
        );
        x += ancho;
      });
      this.y += altura;
      desde += trozo;
    }
    this.numeroFila += 1;
  }
  terminar(): Buffer {
    this.paginas.forEach((pagina, i) => {
      const pie = `Página ${i + 1} de ${this.paginas.length}`;
      pagina.push(`q ${BORDE.join(' ')} RG 0.5 w ${M} 31 m ${W - M} 31 l S Q`);
      const texto = (valor: string, x: number) => {
        const seguro = normalizar(valor).replace(/([\\()])/g, '\\$1');
        pagina.push(
          `q ${GRIS.join(' ')} rg BT /F1 8 Tf ${x} 17 Td (${seguro}) Tj ET Q`,
        );
      };
      texto(
        'ExaControl · Historial de solo lectura · Acceso exclusivo de administradores',
        M,
      );
      texto(pie, W - M - anchoTexto(pie, 8));
    });
    const objetos = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Count ${this.paginas.length} /Kids [${this.paginas.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];
    this.paginas.forEach((pagina, i) => {
      const contenido = pagina.join('\n');
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      );
      objetos.push(
        `<< /Length ${Buffer.byteLength(contenido, 'latin1')} >>\nstream\n${contenido}\nendstream`,
      );
    });
    let body = '%PDF-1.4\n';
    const offsets = [0];
    objetos.forEach((objeto, i) => {
      offsets.push(Buffer.byteLength(body, 'latin1'));
      body += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    });
    const xref = Buffer.byteLength(body, 'latin1');
    body += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    body += offsets
      .slice(1)
      .map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)
      .join('');
    body += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(body, 'latin1');
  }
}
export function generarPdfAuditoria(reporte: ReporteAuditoriaPdf): Buffer {
  const documento = new DocumentoAuditoria(reporte);
  reporte.eventos.forEach((evento) => documento.evento(evento));
  return documento.terminar();
}
