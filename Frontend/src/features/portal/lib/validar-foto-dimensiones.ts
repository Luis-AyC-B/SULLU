import { FOTO_MIN_PX } from '../types/student-profile.types';

/** Diferencia máxima permitida entre ancho y alto para considerarla cuadrada (2 %). */
const TOLERANCIA_CUADRADA = 0.02;

function leerDimensiones(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/** Valida las medidas de la fotografía. Devuelve un mensaje de error, o null si son válidas. */
export async function validarDimensionesFoto(file: File): Promise<string | null> {
  let dimensiones: { width: number; height: number };
  try {
    dimensiones = await leerDimensiones(file);
  } catch {
    return 'No pudimos leer la imagen. Elige otro archivo.';
  }
  const { width, height } = dimensiones;
  if (width < FOTO_MIN_PX || height < FOTO_MIN_PX) {
    return `La fotografía debe medir al menos ${FOTO_MIN_PX} × ${FOTO_MIN_PX} px (la tuya mide ${width} × ${height} px).`;
  }
  if (Math.abs(width - height) > Math.max(width, height) * TOLERANCIA_CUADRADA) {
    return `La fotografía debe ser cuadrada, con el mismo ancho y alto (la tuya mide ${width} × ${height} px).`;
  }
  return null;
}