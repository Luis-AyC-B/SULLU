export interface ResultadoComparacionFacial {
  similitud: number | null;
  rostrosDetectados: number;
  rostrosDetectadosBase?: number;
  error?: string;
}

export interface ResultadoDeteccionRostros {
  rostrosDetectados: number;
  error?: string;
}

export interface ComparadorFacial {
  comparar(base: Buffer, nueva: Buffer): Promise<ResultadoComparacionFacial>;
  detectarRostros(imagen: Buffer): Promise<ResultadoDeteccionRostros>;
}

export const COMPARADOR_FACIAL_TOKEN = 'COMPARADOR_FACIAL_TOKEN';

