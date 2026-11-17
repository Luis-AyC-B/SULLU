import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';

export async function subirFotoEstudiante(
  buffer: Buffer,
  nombre: string,
  contentType: string,
): Promise<string> {
  const base = (process.env.SUPABASE_URL as string).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY as string;
  const bucket = process.env.SUPABASE_BUCKET || 'FotosEstudiantes';
  const ruta = `estudiantes/${nombre}`;
  const r = await fetch(`${base}/storage/v1/object/${bucket}/${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: new Uint8Array(buffer),
  });
  if (!r.ok) {
    throw new Error(`Supabase Storage ${r.status}: ${await r.text()}`);
  }
  return `${base}/storage/v1/object/public/${bucket}/${ruta}`;
}

export async function leerFotoEstudiante(archivo: string): Promise<Buffer> {
  if (/^https?:\/\//.test(archivo)) {
    const r = await fetch(archivo);
    if (!r.ok) throw new Error(`Foto no disponible (${r.status})`);
    return Buffer.from(await r.arrayBuffer());
  }
  const directorio = resolve('uploads/estudiantes');
  const ruta = resolve('.', archivo.replace(/^\/+/, ''));
  if (!ruta.startsWith(directorio + sep)) throw new Error('Ruta inválida');
  return readFile(ruta);
}
