import { readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { createClient } from '@supabase/supabase-js';

export async function subirFotoEstudiante(
  buffer: Buffer,
  nombre: string,
  contentType: string,
): Promise<string> {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string,
  );
  const bucket = process.env.SUPABASE_BUCKET || 'FotosEstudiantes';
  const ruta = `estudiantes/${nombre}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(ruta, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Supabase Storage: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
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
