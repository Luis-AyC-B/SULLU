import { Injectable } from '@nestjs/common';
import {
  ValidadorFoto,
  ResultadoValidacionFoto,
} from './validador-foto.interface';

@Injectable()
export class ValidadorFotoStubService implements ValidadorFoto {
  // Hook/TODO para Sprint 3: IA que compara la foto nueva con la anterior antes de permitir generar el QR.
  // Por ahora la foto válida queda ACTIVA directamente.
  validar(
    _fotoBuffer: Buffer,
    _fotoPreviaBuffer?: Buffer | null,
  ): Promise<ResultadoValidacionFoto> {
    return Promise.resolve({
      aprobado: true,
      motivo: 'Aprobado automáticamente (Sprint 2 - Stub)',
      similitud: 1.0,
    });
  }
}
