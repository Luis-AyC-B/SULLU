import { spawn } from 'child_process';
import { resolve } from 'path';
import type { ComparadorFacial, ResultadoComparacionFacial } from './comparador-facial.interface';

export class MemoryComparadorFacial implements ComparadorFacial {
  private busy = false;
  private async run(input: Record<string, string>): Promise<ResultadoComparacionFacial & { disponible?: boolean }> {
    if (this.busy) throw new Error('MOTOR_OCUPADO');
    this.busy = true;
    try { return await new Promise((ok, fail) => {
      const child = spawn(process.env.HU23_PYTHON || resolve('.venv-hu23/Scripts/python.exe'), ['-B', resolve('scripts/hu23_facial_stdin.py')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = ''; const timer = setTimeout(() => child.kill(), 30000);
      child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); if (output.length > 8192) child.kill(); });
      child.stderr.on('data', () => {}); child.stdin.on('error', () => {});
      child.on('error', () => { clearTimeout(timer); fail(new Error('MOTOR_NO_DISPONIBLE')); });
      child.on('close', code => { clearTimeout(timer); try { if (code !== 0) throw new Error(); ok(JSON.parse(output)); } catch { fail(new Error('MOTOR_NO_DISPONIBLE')); } });
      child.stdin.end(JSON.stringify(input));
    }); } finally { this.busy = false; }
  }
  salud() { return this.run({ modo: 'salud' }); }
  detectarRostros(image: Buffer) { return this.run({ modo: 'detectar', nueva: image.toString('base64') }); }
  comparar(base: Buffer, nueva: Buffer) { return this.run({ modo: 'comparar', base: base.toString('base64'), nueva: nueva.toString('base64') }); }
}
