import { Injectable } from '@nestjs/common';
import {
  ComparadorFacial,
  ResultadoComparacionFacial,
  ResultadoDeteccionRostros,
} from './comparador-facial.interface';

@Injectable()
export class StubComparadorFacial implements ComparadorFacial {
  private simulacionSimilitud: number | null = 0.92;
  private simulacionRostros: number = 1;
  private simulacionError: string | null = null;
  private debeFallar: boolean = false;

  /** Configura valores para tests unitarios */
  configurarSimulacion(opciones: {
    similitud?: number | null;
    rostros?: number;
    error?: string | null;
    debeFallar?: boolean;
  }) {
    if (opciones.similitud !== undefined) this.simulacionSimilitud = opciones.similitud;
    if (opciones.rostros !== undefined) this.simulacionRostros = opciones.rostros;
    if (opciones.error !== undefined) this.simulacionError = opciones.error;
    if (opciones.debeFallar !== undefined) this.debeFallar = opciones.debeFallar;
  }

  reset() {
    this.simulacionSimilitud = 0.92;
    this.simulacionRostros = 1;
    this.simulacionError = null;
    this.debeFallar = false;
  }

  async detectarRostros(imagen: Buffer): Promise<ResultadoDeteccionRostros> {
    if (this.debeFallar) {
      throw new Error('Servicio de detección facial no disponible');
    }

    if (this.simulacionError) {
      return { rostrosDetectados: 0, error: this.simulacionError };
    }

    // Heurística de fallback si la imagen es demasiado pequeña (< 500 bytes)
    if (imagen.length < 500 && this.simulacionRostros === 1) {
      return { rostrosDetectados: 0, error: 'Imagen no contiene rostro detectable' };
    }

    return { rostrosDetectados: this.simulacionRostros };
  }

  async comparar(base: Buffer, nueva: Buffer): Promise<ResultadoComparacionFacial> {
    if (this.debeFallar) {
      throw new Error('Servicio de comparación facial caído / timeout');
    }

    if (this.simulacionError) {
      return {
        similitud: null,
        rostrosDetectados: 0,
        error: this.simulacionError,
      };
    }

    return {
      similitud: this.simulacionSimilitud,
      rostrosDetectados: this.simulacionRostros,
      rostrosDetectadosBase: 1,
    };
  }
}

