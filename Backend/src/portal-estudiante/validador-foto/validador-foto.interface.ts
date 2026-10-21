export interface ResultadoValidacionFoto {
  aprobado: boolean;
  motivo?: string;
  similitud?: number | null;
}

export interface ValidadorFoto {
  validar(
    fotoBuffer: Buffer,
    fotoPreviaBuffer?: Buffer | null,
  ): Promise<ResultadoValidacionFoto>;
}

export const VALIDADOR_FOTO_TOKEN = 'VALIDADOR_FOTO_TOKEN';
