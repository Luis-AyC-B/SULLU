// src/features/ingresos-rechazados/lib/formatoReporteUtils.ts

export function toPascalCase(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function formatFechaExamen(fechaIso: string): string {
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
