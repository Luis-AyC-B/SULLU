import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ComparadorFacial,
  ResultadoComparacionFacial,
  ResultadoDeteccionRostros,
} from './comparador-facial.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalComparadorFacial implements ComparadorFacial {
  private readonly logger = new Logger(LocalComparadorFacial.name);
  private readonly scriptPath: string;

  constructor() {
    this.scriptPath = path.resolve(process.cwd(), 'scripts', 'comparar_rostros.py');
  }

  async detectarRostros(imagen: Buffer): Promise<ResultadoDeteccionRostros> {
    const tempPath = path.join(os.tmpdir(), `detect_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
    try {
      await fs.promises.writeFile(tempPath, imagen);
      const { stdout } = await execFileAsync('python', [this.scriptPath, '--detectar', tempPath]);
      const data = JSON.parse(stdout.trim());
      return {
        rostrosDetectados: data.rostrosDetectados ?? 1,
        error: data.error,
      };
    } catch (err: unknown) {
      this.logger.warn(`Detección facial local no disponible: ${err instanceof Error ? err.message : String(err)}`);
      // Fallback seguro: si el comparador no está disponible, reportar 1 rostro para permitir avanzar a PENDIENTE
      return { rostrosDetectados: 1, error: 'Comparador facial no disponible en este momento' };
    } finally {
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
    }
  }

  async comparar(base: Buffer, nueva: Buffer): Promise<ResultadoComparacionFacial> {
    const tempBase = path.join(os.tmpdir(), `base_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
    const tempNueva = path.join(os.tmpdir(), `nueva_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);

    try {
      await Promise.all([
        fs.promises.writeFile(tempBase, base),
        fs.promises.writeFile(tempNueva, nueva),
      ]);

      const { stdout } = await execFileAsync('python', [this.scriptPath, '--comparar', tempBase, tempNueva]);
      const data = JSON.parse(stdout.trim());

      return {
        similitud: typeof data.similitud === 'number' ? data.similitud : null,
        rostrosDetectados: data.rostrosDetectados ?? 1,
        rostrosDetectadosBase: data.rostrosDetectadosBase ?? 1,
        error: data.error,
      };
    } catch (err: unknown) {
      this.logger.warn(`Comparación facial local falló: ${err instanceof Error ? err.message : String(err)}`);
      // Si el comparador falla o no está disponible, la foto queda PENDIENTE (similitud null)
      return {
        similitud: null,
        rostrosDetectados: 1,
        error: 'Servicio de comparación facial no disponible',
      };
    } finally {
      try {
        await Promise.all([
          fs.promises.unlink(tempBase).catch(() => {}),
          fs.promises.unlink(tempNueva).catch(() => {}),
        ]);
      } catch {}
    }
  }
}

