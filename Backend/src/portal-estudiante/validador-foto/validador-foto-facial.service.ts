import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  COMPARADOR_FACIAL_TOKEN,
  type ComparadorFacial,
} from '../facial/comparador-facial.interface';
import type {
  ValidadorFoto,
  ResultadoValidacionFoto,
} from './validador-foto.interface';

@Injectable()
export class ValidadorFotoFacialService implements ValidadorFoto {
  constructor(
    @Inject(COMPARADOR_FACIAL_TOKEN) private readonly facial: ComparadorFacial,
  ) {}

  async validar(foto: Buffer): Promise<ResultadoValidacionFoto> {
    try {
      const resultado = await this.facial.detectarRostros(foto);
      if (resultado.error) throw new Error(resultado.error);
      return {
        aprobado: resultado.rostrosDetectados === 1,
        motivo:
          resultado.rostrosDetectados === 1
            ? undefined
            : 'La fotografía debe contener un único rostro visible',
      };
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo validar la fotografía con el motor facial',
      );
    }
  }
}
