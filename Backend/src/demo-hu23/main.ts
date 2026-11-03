import 'reflect-metadata';
import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Module, Param, ParseIntPipe, Post, ServiceUnavailableException, UploadedFile, UseInterceptors, ConflictException, UnauthorizedException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import sizeOf from 'image-size';
import { memoryStorage } from 'multer';
import { MemoryComparadorFacial } from '../portal-estudiante/facial/memory-comparador-facial.service';

type Row = { token: string; estudianteId: number; examenId: number; expiraEn: Date; generadoEn: Date; tipo: string };
const sessions = new Map<string, { role: string; touched: number }>(), tokens = new Map<string, Row>(), used = new Map<string,{examenId:number;fechaHora:string}>();
const exams = [{ id: 2301, nombre: 'Matemáticas — HU23', ambiente: 'Aula A' }, { id: 2302, nombre: 'Programación — HU23', ambiente: 'Laboratorio B' }];
const facial = new MemoryComparadorFacial(); let reference: Buffer | undefined, version = 1;
let qr: import('../portal-estudiante/qr-token.service').QrTokenService;
export const repository = {
  estudiante: { findUnique: async () => ({ id: 900001, qrVersion: version }) },
  codigoQr: {
    create: async ({ data }: { data: Row }) => { tokens.set(data.token, data); return data; },
    findUnique: async ({ where }: { where: { token: string } }) => tokens.get(where.token),
    deleteMany: async ({ where }: { where: { token: string } }) => tokens.delete(where.token),
  },
};
function problem(code: string, message: string) { return new BadRequestException({ codigo: code, mensaje: message, message }); }
function actor(token: string, role?: string) {
  const session = sessions.get(token);
  if (!session || Date.now() - session.touched > 3600000) throw new UnauthorizedException('Sesión demo vencida');
  if (role && session.role !== role) throw new ForbiddenException('Rol demo no autorizado');
  session.touched = Date.now();
}
function image(file?: Express.Multer.File) {
  if (!file?.buffer?.length || file.buffer.length > 2097152 || !['image/jpeg', 'image/png'].includes(file.mimetype)) throw problem('FOTO_INVALIDA', 'Envía JPG o PNG de hasta 2 MB');
  const b = file.buffer, jpg = b[0] === 255 && b[1] === 216 && b[2] === 255, png = b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  try { const { width, height } = sizeOf(b); if ((!jpg && !png) || !width || !height || Math.min(width,height) < 80 || width * height > 16000000) throw new Error(); }
  catch { throw problem('FOTO_INVALIDA', 'Imagen inválida o demasiado grande'); } return b;
}
const upload = { storage: memoryStorage(), limits: { fileSize: 2097152, files: 1, fields: 0, parts: 2 } };
@Controller('demo/hu23')
export class DemoController {
  @Get('health') async health() { const result = await facial.salud(); if (!result.disponible) throw new ServiceUnavailableException('Motor facial no disponible'); return { ...result, postgres: false }; }
  @Post('session') login(@Body() body: { email: string; password: string }) {
    if (process.env.HU23_DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production' || body?.password !== 'Hu23Demo!26' || !['estudiante@hu23.local','control@hu23.local'].includes(body?.email)) throw new UnauthorizedException('Credenciales demo inválidas');
    for (const [key, value] of sessions) if (Date.now() - value.touched > 3600000) sessions.delete(key);
    if (sessions.size >= 20) throw new ServiceUnavailableException('Reinicia la demo para limpiar sesiones');
    const role = body.email.startsWith('estudiante') ? 'Estudiante' : 'Control', token = randomBytes(32).toString('hex'); sessions.set(token, { role, touched: Date.now() });
    return { id: role === 'Estudiante' ? '900001' : '900002', name: `${role} de demostración`, email: body.email, rol: role, accessToken: `hu23-demo:${token}`, permisos: role === 'Estudiante' ? ['portal_estudiante'] : ['control_ingreso.ver_examenes_asignados','control_ingreso.escanear_qr'] };
  }
  @Get('estudiantes/me/perfil') profile(@Headers('x-hu23-session') session: string) {
    actor(session); return { id:900001, nombre:'Estudiante de demostración', apellido:'', sis:'DEMO-23001', cod_sis:'DEMO-23001', correo:'estudiante@hu23.local', ci:'12345678', telefono:'70000000', perfilCompleto:true, debeConfigurarPerfil:false, debeCambiarPassword:false, fotoUrl: reference ? `data:image/${reference[0]===255?'jpeg':'png'};base64,${reference.toString('base64')}` : null };
  }
  @Get('estudiantes/me/examenes') studentExams(@Headers('x-hu23-session') session: string) {
    actor(session,'Estudiante'); return { verificacionFotoActiva:true, examenes: this.assignedData() };
  }
  private assignedData() { return exams.map(ex => ({ ...ex, asignatura:ex.nombre, carrera:'Ingeniería de Sistemas', facultad:'FCyT', habilitado:true, estadoQr:'DISPONIBLE', qrGenerado:false, estado:'EN_CURSO', totalEstudiantes:1, fecha:new Date().toISOString().slice(0,10), horario:'Demostración local', fechaInicio:new Date(Date.now()-60000).toISOString(), fechaFin:new Date(Date.now()+3600000).toISOString() })); }
  @Post('estudiantes/me/foto') @UseInterceptors(FileInterceptor('foto', upload))
  async register(@Headers('x-hu23-session') session: string, @UploadedFile() file?: Express.Multer.File) {
    try { actor(session,'Estudiante'); const b=image(file), result=await facial.detectarRostros(b);
      if (result.error) throw new ServiceUnavailableException('Motor facial no disponible');
      if (result.rostrosDetectados!==1) throw problem('SIN_ROSTRO', 'La referencia debe tener exactamente un rostro');
      reference?.fill(0); reference=Buffer.from(b); version++; tokens.clear(); used.clear(); return { estado:'ACTIVA', message:'Referencia solo en memoria' };
    } finally { file?.buffer?.fill(0); }
  }
  @Post('estudiantes/me/examenes/:id/qr') @UseInterceptors(FileInterceptor('selfie', upload))
  async generate(@Headers('x-hu23-session') session: string, @Param('id', ParseIntPipe) id: number, @UploadedFile() file?: Express.Multer.File) {
    try { actor(session,'Estudiante'); const b=image(file), currentVersion=version;
      if (!exams.some(e=>e.id===id)) throw new ForbiddenException('Examen no habilitado');
      if (!reference) throw problem('FOTO_REFERENCIA_FALTANTE', 'Registra primero tu fotografía de referencia');
      const result=await facial.comparar(reference,b);
      if (result.error) throw new ServiceUnavailableException('Motor facial no disponible; no se emitió QR');
      if (result.rostrosDetectados!==1 || result.rostrosDetectadosBase!==1) throw problem('SIN_ROSTRO', result.rostrosDetectados>1 ? 'Se detectaron varios rostros. Captura solo tu rostro.' : 'No se detectó exactamente un rostro válido');
      const threshold=Number(process.env.HU23_FACE_THRESHOLD||0.45);
      if (typeof result.similitud!=='number' || !Number.isFinite(result.similitud) || result.similitud<threshold) throw problem('VERIFICACION_FALLIDA','El rostro no coincide con la referencia');
      if (currentVersion!==version) throw new ConflictException('La referencia cambió');
      for (const [key,row] of tokens) if (row.expiraEn.getTime()<=Date.now()) tokens.delete(key);
      if (tokens.size+used.size>=100) throw new ConflictException('Reinicia la demo para limpiar QR');
      const end=new Date(Date.now()+600000), token=await qr.generarParaExamen(900001,id,end);
      return { qrUrl:token, token, vigenteHasta:end.toISOString(), similitud:result.similitud };
    } finally { file?.buffer?.fill(0); }
  }
  @Get('control-ingreso/mis-examenes') assigned(@Headers('x-hu23-session') session: string) { actor(session,'Control'); return this.assignedData(); }
  @Get('control-ingreso/examenes/:id/resumen') summary(@Headers('x-hu23-session') session: string, @Param('id',ParseIntPipe) id:number) {
    actor(session,'Control'); const ex=exams.find(e=>e.id===id); if(!ex)throw new BadRequestException();
    const entries=[...used.values()].filter(row=>row.examenId===id),count=entries.length?1:0;
    return { ...ex, examenId:id, asignatura:ex.nombre, totalHabilitados:1, ingresados:count, pendientes:1-count, incidencias:0, ultimosIngresos:entries.map((row,i)=>({id:i+1,nombre:'Estudiante de demostración',codSis:'DEMO-23001',hora:row.fechaHora,metodo:'QR'})), estado:'EN_CURSO', horario:'Demostración local' };
  }
  @Post('ingresos/qr') async verify(@Headers('x-hu23-session') session:string, @Body() body:{token:string;examenId:number}) {
    actor(session,'Control'); if(!body || typeof body.token!=='string' || body.token.length>4096)throw new BadRequestException('QR inválido');
    if(used.has(body.token))throw new ConflictException('QR ya utilizado');
    try{await qr.validar(body.token,'examen');}catch{throw new BadRequestException('QR inválido o vencido');} const row=tokens.get(body.token), ex=exams.find(e=>e.id===body.examenId);
    if(!row || !ex || row.examenId!==body.examenId)throw new BadRequestException('QR de otro examen');
    return { success:true, estudiante:{ nombre:'Estudiante de demostración', codSis:'DEMO-23001', fotoUrl:this.profile(session).fotoUrl, examen:ex.nombre, ambienteAsignado:ex.ambiente, requiereConfirmacion:true } };
  }
  @Post('ingresos/qr/confirmar') async confirm(@Headers('x-hu23-session') session:string,@Body() body:{token:string;examenId:number}) {
    await this.verify(session,body); if(used.has(body.token))throw new ConflictException('QR ya utilizado'); used.set(body.token,{examenId:body.examenId,fechaHora:new Date().toISOString()}); tokens.delete(body.token); return { message:'Ingreso registrado' };
  }
}
@Module({controllers:[DemoController]}) class DemoModule {}
export async function bootstrap() {
  if(process.env.HU23_DEMO_MODE!=='true'||process.env.NODE_ENV==='production')throw new Error('Demo solo local con HU23_DEMO_MODE=true');
  const threshold=Number(process.env.HU23_FACE_THRESHOLD||0.45); if(!Number.isFinite(threshold)||threshold<0.3||threshold>1)throw new Error('Umbral inválido');
  initializeQr();
  if(process.env.HU23_REFERENCE_IMAGE){ const b=readFileSync(process.env.HU23_REFERENCE_IMAGE); image({buffer:b,mimetype:b[0]===255?'image/jpeg':'image/png'} as Express.Multer.File); const result=await facial.detectarRostros(b); if(result.error||result.rostrosDetectados!==1)throw new Error('Referencia local inválida'); reference=b; }
  const app=await NestFactory.create(DemoModule,{logger:['error','warn']});
  app.enableCors({origin:['http://localhost:4000','http://127.0.0.1:4000'],allowedHeaders:['Content-Type','X-HU23-Session']});
  app.use((_req:unknown,res:{setHeader(k:string,v:string):void},next:()=>void)=>{res.setHeader('Cache-Control','no-store');next();});
  await app.listen(3003,'127.0.0.1'); console.log('HU23 DEMO: http://127.0.0.1:3003 — sin PostgreSQL'); return app;
}
export function initializeQr(){process.env.QR_SECRET=randomBytes(48).toString('hex');const {QrTokenService}=require('../portal-estudiante/qr-token.service');qr=new QrTokenService(repository,new JwtService());}
if(require.main===module)void bootstrap();
