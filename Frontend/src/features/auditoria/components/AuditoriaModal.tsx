'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Download, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { auditoriaApi, type DetalleAuditoria, type EventoAuditoria, type FiltrosAuditoria, type OpcionesAuditoria, type PaginaAuditoria } from '../api/auditoria.service';
export function formatearFechaAuditoria(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) return 'Fecha no disponible';
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(fecha);
}

const fecha = formatearFechaAuditoria;

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const seleccionClase = 'mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const valor = (dato: unknown) => dato === null || dato === undefined ? '—' : typeof dato === 'object' ? JSON.stringify(dato) : String(dato);
const registro = (e: EventoAuditoria) => e.registroClave ? Object.entries(e.registroClave).map(([k, v]) => `${k}: ${valor(v)}`).join(', ') : valor(e.registroId);
const accionNombre = (accion: string) => ({ CREACION: 'Creación', MODIFICACION: 'Modificación', ELIMINACION: 'Eliminación' }[accion] ?? accion.replaceAll('_', ' '));

function periodoActual(): FiltrosAuditoria {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return { mes: Number(partes.find((p) => p.type === 'month')?.value), anio: Number(partes.find((p) => p.type === 'year')?.value) };
}

function Accion({ accion }: { accion: string }) {
  const clase = accion === 'CREACION' ? 'bg-success/10 text-success' : accion === 'ELIMINACION' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${clase}`}>{accionNombre(accion)}</span>;
}

export function AuditoriaModal() {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<FiltrosAuditoria>(periodoActual);
  const [consulta, setConsulta] = useState({ filtros: periodoActual(), pagina: 1, intento: 0 });
  const [opciones, setOpciones] = useState<OpcionesAuditoria | null>(null);
  const [datos, setDatos] = useState<PaginaAuditoria | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetalleAuditoria | null>(null);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState('');
  const bloqueoDescarga = useRef(false);

  useEffect(() => {
    if (!abierto) return;
    const controller = new AbortController();
    setCargando(true);
    setError('');
    Promise.all([
      auditoriaApi.listar(consulta.filtros, consulta.pagina, controller.signal),
      auditoriaApi.opciones(controller.signal),
    ]).then(([pagina, opcionesNuevas]) => {
      if (controller.signal.aborted) return;
      setDatos(pagina);
      setOpciones(opcionesNuevas);
    }).catch(() => {
      if (!controller.signal.aborted) setError('No se pudo consultar la auditoría. Verifica tu conexión y tus permisos.');
    }).finally(() => {
      if (!controller.signal.aborted) setCargando(false);
    });
    return () => controller.abort();
  }, [abierto, consulta]);

  useEffect(() => {
    if (detalleId === null) return;
    const controller = new AbortController();
    setDetalle(null);
    setErrorDetalle('');
    auditoriaApi.detalle(detalleId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetalle(data);
    }).catch(() => {
      if (!controller.signal.aborted) setErrorDetalle('No se pudo cargar el detalle. Cierra y vuelve a intentarlo.');
    });
    return () => controller.abort();
  }, [detalleId]);

  async function descargar() {
    if (bloqueoDescarga.current) return;
    bloqueoDescarga.current = true;
    setDescargando(true);
    setErrorDescarga('');
    try {
      const archivo = await auditoriaApi.descargar(consulta.filtros);
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `auditoria_${consulta.filtros.anio}_${String(consulta.filtros.mes).padStart(2, '0')}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setConfirmar(false);
      toast.success('Reporte de auditoría descargado.');
    } catch {
      setErrorDescarga('No se pudo generar el reporte. Puedes reintentar conservando los filtros.');
    } finally {
      bloqueoDescarga.current = false;
      setDescargando(false);
    }
  }

  function cambiarAbierto(open: boolean) {
    if (bloqueoDescarga.current) return;
    if (open) {
      const actual = periodoActual();
      setBorrador(actual);
      setConsulta({ filtros: actual, pagina: 1, intento: 0 });
      setDatos(null);
    } else {
      setDetalleId(null);
      setConfirmar(false);
    }
    setAbierto(open);
  }

  const anioActual = periodoActual().anio;
  const primerAnio = Math.min(opciones?.primerAnio ?? anioActual, anioActual);
  const paginas = Math.max(1, Math.ceil((datos?.total ?? 0) / (datos?.limite ?? 10)));
  const filtroTexto = `${meses[consulta.filtros.mes - 1]} ${consulta.filtros.anio}`;
  const filtrosResumen = [
    opciones?.usuarios.find((u) => (u.usuarioId ?? 0) === consulta.filtros.usuarioId)?.usuarioNombre ?? (consulta.filtros.usuarioId === 0 ? 'Sistema' : 'Todos los usuarios'),
    consulta.filtros.accion ? accionNombre(consulta.filtros.accion) : 'Todas las acciones',
    consulta.filtros.tabla ?? 'Todas las tablas',
  ].join(' · ');

  return <>
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogTrigger asChild><Button size="sm"><ClipboardList className="h-4 w-4" />Auditoría</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:max-w-5xl sm:p-7">
        <DialogHeader className="pr-7">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary"><ClipboardList className="h-5 w-5" />Auditoría</DialogTitle>
          <DialogDescription>Consulta y descarga el historial de operaciones del sistema.</DialogDescription>
        </DialogHeader>
        <form className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 md:grid-cols-5" onSubmit={(e) => {
          e.preventDefault();
          setConsulta({ filtros: { ...borrador }, pagina: 1, intento: consulta.intento + 1 });
        }}>
          <label className="text-xs font-medium text-muted-foreground">Mes
            <select aria-label="Mes" className={seleccionClase} value={borrador.mes} onChange={(e) => setBorrador({ ...borrador, mes: Number(e.target.value) })}>
              {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">Año
            <select aria-label="Año" className={seleccionClase} value={borrador.anio} onChange={(e) => setBorrador({ ...borrador, anio: Number(e.target.value) })}>
              {Array.from({ length: anioActual - primerAnio + 1 }, (_, i) => anioActual - i).map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">Usuario
            <select aria-label="Usuario" className={seleccionClase} value={borrador.usuarioId ?? ''} onChange={(e) => setBorrador({ ...borrador, usuarioId: e.target.value === '' ? undefined : Number(e.target.value) })}>
              <option value="">Todos</option>
              {opciones?.usuarios.map((u) => <option key={u.usuarioId ?? 0} value={u.usuarioId ?? 0}>{u.usuarioNombre ?? 'Sistema'}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">Acción
            <select aria-label="Acción" className={seleccionClase} value={borrador.accion ?? ''} onChange={(e) => setBorrador({ ...borrador, accion: e.target.value || undefined })}>
              <option value="">Todas</option>
              {opciones?.acciones.map((a) => <option key={a} value={a}>{accionNombre(a)}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-medium text-muted-foreground md:col-span-1">Tabla
            <select aria-label="Tabla" className={seleccionClase} value={borrador.tabla ?? ''} onChange={(e) => setBorrador({ ...borrador, tabla: e.target.value || undefined })}>
              <option value="">Todas</option>
              {opciones?.tablas.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <div className="col-span-2 flex justify-end gap-2 md:col-span-5">
            <Button type="button" variant="outline" onClick={() => { const actual = periodoActual(); setBorrador(actual); setConsulta({ filtros: actual, pagina: 1, intento: consulta.intento + 1 }); }} disabled={cargando}>Limpiar filtros</Button>
            <Button type="submit" disabled={cargando}>Aplicar filtros</Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>{filtroTexto} · {datos?.total ?? 0} operaciones · Hora de Bolivia</p>
          <p>Historial de solo lectura</p>
        </div>
        {cargando ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando operaciones...</p>
          : error ? <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive"><p>{error}</p><Button className="mt-3" variant="outline" onClick={() => setConsulta({ ...consulta, intento: consulta.intento + 1 })}>Reintentar</Button></div>
          : !datos?.data.length ? <p className="py-12 text-center text-muted-foreground">No hay operaciones registradas para este periodo y filtros.</p>
          : <>
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-primary"><tr>{['Fecha y hora', 'Usuario', 'Acción', 'Tabla / Registro', 'Detalle'].map((t) => <th key={t} className="px-3 py-3 font-semibold">{t}</th>)}</tr></thead>
                <tbody>{datos.data.map((e) => <tr key={e.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-3">{fecha(e.fechaHora)}</td>
                  <td className="px-3 py-3">{e.usuarioNombre ?? 'Sistema'}</td>
                  <td className="px-3 py-3"><Accion accion={e.accion} /></td>
                  <td className="max-w-60 break-words px-3 py-3">{e.registroDescripcion && <p className="font-medium">{e.registroDescripcion}</p>}<p className="mt-1 text-muted-foreground">{e.tablaAfectada ?? '—'} · {registro(e)}</p></td>
                  <td className="px-3 py-3"><Button variant="ghost" size="sm" onClick={() => setDetalleId(e.id)} aria-label={`Ver detalle de operación ${e.id}`}><Eye />Ver detalle</Button></td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">{datos.data.map((e) => <article key={e.id} className="space-y-2 rounded-xl border border-border p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2"><Accion accion={e.accion} /><span className="text-muted-foreground">{fecha(e.fechaHora)}</span></div>
              <p className="text-sm font-semibold">{e.usuarioNombre ?? 'Sistema'}</p>{e.registroDescripcion && <p className="break-words font-medium">{e.registroDescripcion}</p>}<p className="break-words text-muted-foreground">{e.tablaAfectada ?? '—'} · {registro(e)}</p>
              <Button variant="outline" size="sm" onClick={() => setDetalleId(e.id)} aria-label={`Ver detalle de operación ${e.id}`}><Eye />Ver detalle</Button>
            </article>)}</div>
          </>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs">
            <Button variant="outline" size="sm" disabled={cargando || !!error || consulta.pagina <= 1} onClick={() => setConsulta({ ...consulta, pagina: consulta.pagina - 1 })}>Anterior</Button>
            <span>Página {consulta.pagina} de {paginas}</span>
            <Button variant="outline" size="sm" disabled={cargando || !!error || consulta.pagina >= paginas} onClick={() => setConsulta({ ...consulta, pagina: consulta.pagina + 1 })}>Siguiente</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => cambiarAbierto(false)}>Cerrar</Button>
            <Button disabled={cargando || !!error || !datos?.total} onClick={() => { setErrorDescarga(''); setConfirmar(true); }}><Download />Descargar PDF</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={detalleId !== null} onOpenChange={(open) => { if (!open) setDetalleId(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-2xl">
        <DialogHeader><DialogTitle className="text-xl font-bold text-primary">Detalle de la operación</DialogTitle><DialogDescription>Valores anteriores y nuevos del registro afectado.</DialogDescription></DialogHeader>
        {errorDetalle ? <p role="alert" className="text-destructive">{errorDetalle}</p> : !detalle ? <p role="status">Cargando detalle...</p> : <>
          <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-xs"><Accion accion={detalle.accion} /><p><strong>Responsable:</strong> {detalle.usuarioNombre ?? 'Sistema'}</p><p><strong>Fecha y hora:</strong> {fecha(detalle.fechaHora)}</p>{detalle.registroDescripcion && <p className="break-words"><strong>Registro afectado:</strong> {detalle.registroDescripcion}</p>}<p className="break-words"><strong>Tabla:</strong> {detalle.tablaAfectada ?? '—'} · <strong>Registro:</strong> {registro(detalle)}</p></div>
          {detalle.cambios.length ? <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full table-fixed text-left text-xs"><thead className="bg-muted/50 text-primary"><tr><th className="p-3">Campo</th><th className="p-3">Valor anterior</th><th className="p-3">Valor nuevo</th></tr></thead><tbody>{detalle.cambios.map((c) => <tr key={c.campo} className="border-t border-border"><td className="break-words p-3 font-medium">{c.campo}</td><td className="break-all p-3 text-muted-foreground">{valor(c.anterior)}</td><td className="break-all p-3">{valor(c.nuevo)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Este evento no contiene cambios de campos. Los eventos antiguos pueden no disponer de valores anteriores.</p>}
        </>}
        <div className="flex justify-end"><Button variant="outline" onClick={() => setDetalleId(null)}>Volver a auditoría</Button></div>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmar} onOpenChange={(open) => { if (!bloqueoDescarga.current) setConfirmar(open); }}>
      <DialogContent className="rounded-2xl bg-card p-6 sm:max-w-md" showCloseButton={!descargando}>
        <DialogHeader><DialogTitle className="text-xl font-bold text-primary">Confirmar descarga</DialogTitle><DialogDescription>Se descargará el reporte PDF de {filtroTexto}.</DialogDescription></DialogHeader>
        <div className="rounded-xl bg-muted/50 p-4 text-sm"><p className="font-semibold">{datos?.total ?? 0} operaciones</p><p className="mt-2 text-xs text-muted-foreground">{filtrosResumen}</p><p className="mt-2 text-xs text-muted-foreground">Incluye todas las páginas y el detalle de los cambios disponibles al generar el reporte.</p></div>
        {errorDescarga && <p role="alert" className="text-sm text-destructive">{errorDescarga}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={descargando} onClick={() => setConfirmar(false)}>Cancelar</Button><Button disabled={descargando} onClick={() => void descargar()}>{descargando ? <><Loader2 className="animate-spin" />Generando PDF...</> : errorDescarga ? 'Reintentar' : 'Confirmar'}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
