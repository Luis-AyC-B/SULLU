import { studentLoginSchema } from '../types/student-exam.types';

function mensajes(result: ReturnType<typeof studentLoginSchema.safeParse>, campo: string) {
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path[0] === campo).map((i) => i.message);
}

describe('UT-PE-01: studentLoginSchema valida el ingreso con SIS y CI', () => {
  it('1. acepta un SIS numérico y un CI no vacío', () => {
    const result = studentLoginSchema.safeParse({ sis: '201900123', ci: '8123456' });
    expect(result.success).toBe(true);
  });

  it('2. rechaza el SIS vacío y marca el campo SIS', () => {
    const result = studentLoginSchema.safeParse({ sis: '', ci: '8123456' });
    expect(result.success).toBe(false);
    expect(mensajes(result, 'sis')).toContain('El código SIS es obligatorio');
    expect(mensajes(result, 'ci')).toHaveLength(0);
  });

  it('3. rechaza el CI vacío y marca el campo CI', () => {
    const result = studentLoginSchema.safeParse({ sis: '201900123', ci: '' });
    expect(result.success).toBe(false);
    expect(mensajes(result, 'ci')).toContain('El CI es obligatorio');
    expect(mensajes(result, 'sis')).toHaveLength(0);
  });

  it('4. rechaza un SIS con letras', () => {
    const result = studentLoginSchema.safeParse({ sis: 'abc123', ci: '8123456' });
    expect(result.success).toBe(false);
    expect(mensajes(result, 'sis')).toContain('El código SIS solo debe contener números');
  });

  it('5. recorta espacios: un SIS de solo espacios es vacío y uno con espacios se limpia', () => {
    const vacio = studentLoginSchema.safeParse({ sis: '   ', ci: '8123456' });
    expect(vacio.success).toBe(false);
    expect(mensajes(vacio, 'sis')).toContain('El código SIS es obligatorio');

    const conEspacios = studentLoginSchema.safeParse({ sis: ' 201900123 ', ci: ' 8123456 ' });
    expect(conEspacios.success).toBe(true);
    if (conEspacios.success) {
      expect(conEspacios.data).toEqual({ sis: '201900123', ci: '8123456' });
    }
  });
});
