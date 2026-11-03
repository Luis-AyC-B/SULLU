import { DemoController, initializeQr } from './main';
import { MemoryComparadorFacial } from '../portal-estudiante/facial/memory-comparador-facial.service';
import { JwtService } from '@nestjs/jwt';

// Only business rules use a controlled comparator. Runtime demo always executes Python.
describe('HU23 integration contracts (controlled inference)',()=>{
  const api=new DemoController(); let student:string,control:string;
  const file=()=>({mimetype:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAID','base64')}) as Express.Multer.File;
  const compare=jest.spyOn(MemoryComparadorFacial.prototype,'comparar');
  beforeAll(()=>{process.env.HU23_DEMO_MODE='true';initializeQr();jest.spyOn(MemoryComparadorFacial.prototype,'detectarRostros').mockResolvedValue({rostrosDetectados:1,similitud:null});});
  beforeEach(async()=>{
    student=api.login({email:'estudiante@hu23.local',password:'Hu23Demo!26'}).accessToken.slice(10);
    control=api.login({email:'control@hu23.local',password:'Hu23Demo!26'}).accessToken.slice(10);
    await api.register(student,file());compare.mockResolvedValue({similitud:0.9,rostrosDetectados:1,rostrosDetectadosBase:1});
  });
  afterAll(()=>{jest.restoreAllMocks();delete process.env.HU23_DEMO_MODE;});
  it('preserves profile/exams, rejects wrong credentials and crossing roles',async()=>{
    expect(api.studentExams(student).examenes).toHaveLength(2);
    expect(api.profile(control).fotoUrl).toBe(api.profile(student).fotoUrl);
    expect(()=>api.login({email:'admin@exacontrol.com',password:'Hu23Demo!26'})).toThrow();
    await expect(api.generate(control,2301,file())).rejects.toThrow();
    await expect(api.generate(student,2301)).rejects.toThrow();
  });
  it('signs using existing QrTokenService and consumes only on confirmation',async()=>{
    const r=await api.generate(student,2301,file());
    expect(new JwtService().decode(r.token)).toEqual(expect.objectContaining({examenId:2301,tipo:'examen'}));
    await expect(api.verify(control,{token:r.token,examenId:2302})).rejects.toThrow();
    expect((await api.verify(control,{token:r.token,examenId:2301})).estudiante.requiereConfirmacion).toBe(true);
    await api.confirm(control,{token:r.token,examenId:2301});
    await expect(api.verify(control,{token:r.token,examenId:2301})).rejects.toThrow('ya utilizado');
  });
  it.each([0,2])('rejects %i faces and clears the upload',async count=>{
    compare.mockResolvedValue({similitud:0.99,rostrosDetectados:count,rostrosDetectadosBase:1});const f=file();
    await expect(api.generate(student,2301,f)).rejects.toThrow();expect(f.buffer.every(b=>b===0)).toBe(true);
  });
  it('rejects nonmatch, errors, invalid and expired QR',async()=>{
    compare.mockResolvedValueOnce({similitud:0.1,rostrosDetectados:1,rostrosDetectadosBase:1});
    await expect(api.generate(student,2301,file())).rejects.toThrow();
    compare.mockRejectedValueOnce(new Error('Unavailable'));await expect(api.generate(student,2301,file())).rejects.toThrow();
    await expect(api.verify(control,{token:'invalid.token.signature',examenId:2301})).rejects.toThrow();
    const r=await api.generate(student,2301,file()),clock=jest.spyOn(Date,'now').mockReturnValue(Date.now()+610000);
    try{await expect(api.verify(control,{token:r.token,examenId:2301})).rejects.toThrow();}finally{clock.mockRestore();}
  });
});
