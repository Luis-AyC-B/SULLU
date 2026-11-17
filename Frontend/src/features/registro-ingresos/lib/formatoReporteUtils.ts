// src/features/registro-ingresos/lib/formatoReporteUtils.ts

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
 * Ej: "Bases de Datos I – Primer parcial - 19/10/2026" -> "Bases de Datos I"
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
 * Genera el nombre del archivo según el formato requerido (Criterio 36):
 * ingresos_[Facultad]_[Materia]_[Gestion]_[Fecha].pdf
 */
export function formatearNombreArchivoReporte(
  nombreExamenOMateria: string,
  fecha: string,
  gestion?: string,
  facultad?: string
): string {
  let materiaLimpia = '';
  if (nombreExamenOMateria.toLowerCase().includes('todas')) {
    materiaLimpia = 'TodasLasMaterias';
  } else {
    materiaLimpia = toPascalCase(obtenerNombreMateria(nombreExamenOMateria)) || 'Materia';
  }

  let fechaFormateada = fecha;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y, m, d] = fecha.split('-');
    fechaFormateada = `${d}-${m}-${y}`;
  } else {
    fechaFormateada = fecha.replace(/[^a-zA-Z0-9-]/g, '');
  }

  if (!gestion && !facultad) {
    const examen = toPascalCase(obtenerNombreParcial(nombreExamenOMateria)) || 'Examen';
    return `ingresos_${materiaLimpia}_${examen}_${fechaFormateada}.pdf`;
  }

  const gestionFormato = gestion
    ? gestion
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/\//g, '-')
    : 'Gestion2-2026';

  if (facultad && facultad !== 'TODAS' && !facultad.toLowerCase().includes('todas')) {
    const matchAcronym = /\(([A-Za-z0-9]+)\)/.exec(facultad);
    const facLimpia = matchAcronym
      ? matchAcronym[1]
      : toPascalCase(facultad) || 'FCyT';
    return `ingresos_${facLimpia}_${materiaLimpia}_${gestionFormato}_${fechaFormateada}.pdf`;
  }

  return `ingresos_${materiaLimpia}_${gestionFormato}_${fechaFormateada}.pdf`;
}
