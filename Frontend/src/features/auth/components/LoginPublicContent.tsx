'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { getExamenesPublicos } from '../api/examenes-publicos.api';
import { ExamenPublico } from '../types/examenes-publicos.types';
import { ExamenesFechaModal } from './ExamenesFechaModal';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MESES_ABREV = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

/**
 * Contenido Principal de la Página de Bienvenida
 * Contiene la sección izquierda de "Noticias e informaciones"
 * y la sección derecha con el widget de "Calendario", "Próximos eventos" y "Enlaces".
 * Basado fielmente en media_1789852716106.png y media_1790911322400.png.
 */
export function LoginPublicContent() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [examenes, setExamenes] = useState<ExamenPublico[]>([]);
  const [selectedFecha, setSelectedFecha] = useState<string>('');
  const [modalExamenes, setModalExamenes] = useState<ExamenPublico[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cargar exámenes desde el backend
  useEffect(() => {
    let isMounted = true;
    getExamenesPublicos().then((data) => {
      if (isMounted) {
        setExamenes(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Cálculo de día actual ("Hoy")
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();

  // Días en el mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Desfase del primer día de la semana (Lunes = 0 ... Domingo = 6)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Mapeo de exámenes por fecha 'YYYY-MM-DD'
  const examenesPorFecha = useMemo(() => {
    const map = new Map<string, ExamenPublico[]>();
    for (const ex of examenes) {
      if (!ex.fecha) continue;
      const list = map.get(ex.fecha) ?? [];
      list.push(ex);
      map.set(ex.fecha, list);
    }
    return map;
  }, [examenes]);

  // Próximos 3 eventos para la tarjeta inferior
  const proximos3Examenes = useMemo(() => {
    const hoyStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const ordenados = [...examenes].sort((a, b) => {
      const cmp = a.fecha.localeCompare(b.fecha);
      if (cmp !== 0) return cmp;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

    const futuros = ordenados.filter((ex) => ex.fecha >= hoyStr);
    const seleccion = futuros.length > 0 ? futuros : ordenados;
    return seleccion.slice(0, 3);
  }, [examenes, today]);

  const abrirModalFecha = (fechaStr: string) => {
    setSelectedFecha(fechaStr);
    const exams = examenesPorFecha.get(fechaStr) ?? [];
    setModalExamenes(exams);
    setIsModalOpen(true);
  };
  return (
    <section id="noticias" className="bg-[#F8F9FA] py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* ========================================================
            COLUMNA IZQUIERDA: NOTICIAS E INFORMACIONES
            ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-5 w-1 rounded-full bg-[#E30613]" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Noticias e informaciones
            </h2>
          </div>

          <div className="space-y-4">
            {/* Noticia 1: AVISO */}
            <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#DC2626]">
                  AVISO
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  05 Sep 2026
                </span>
              </div>
              <h3 className="mt-2.5 text-sm sm:text-base font-bold text-slate-900 leading-snug hover:text-[#003770] transition-colors cursor-pointer">
                Período de habilitaciones abierto para Exámenes de Septiembre
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Los docentes pueden proceder a habilitar a sus estudiantes desde el sistema. El plazo cierra el 08 de septiembre.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#003770] hover:underline"
                >
                  Leer más <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </article>

            {/* Noticia 2: NOTICIAS */}
            <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#E0F2FE] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#0284C7]">
                  NOTICIAS
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  02 Sep 2026
                </span>
              </div>
              <h3 className="mt-2.5 text-sm sm:text-base font-bold text-slate-900 leading-snug hover:text-[#003770] transition-colors cursor-pointer">
                Nuevos ambientes de examen habilitados en el Edificio B
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Se incorporan tres nuevas salas con capacidad para 40, 60 y 85 estudiantes respectivamente.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#003770] hover:underline"
                >
                  Leer más <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </article>

            {/* Noticia 3: MANTENIMIENTO */}
            <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#D97706]">
                  MANTENIMIENTO
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  28 Aug 2026
                </span>
              </div>
              <h3 className="mt-2.5 text-sm sm:text-base font-bold text-slate-900 leading-snug hover:text-[#003770] transition-colors cursor-pointer">
                Actualización del sistema programada para el 30/08
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                El sistema estará en mantenimiento de 2:00 a 4:00 AM. Las habilitaciones guardadas no se verán afectadas.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#003770] hover:underline"
                >
                  Leer más <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </article>
          </div>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: CALENDARIO, PRÓXIMOS EVENTOS Y ENLACES
            ======================================================== */}
        <div id="calendario" className="lg:col-span-5 xl:col-span-4 space-y-6 scroll-mt-20">
          
          {/* SECCIÓN CALENDARIO */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-5 w-1 rounded-full bg-[#E30613]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Calendario
              </h2>
            </div>

            {/* Tarjeta Calendario */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              {/* Cabecera Azul Marina */}
              <div className="bg-[#072B54] px-4 py-3 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <span>
                      {MESES[month]} {year}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-[#E30613]" />
                    Fechas programadas
                  </div>
                </div>

                {/* Controles para cambiar de mes */}
                <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-white/20 rounded transition-colors text-slate-200 hover:text-white"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-white/20 rounded transition-colors text-slate-200 hover:text-white"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Grilla del Calendario */}
              <div className="p-4">
                {/* Cabecera Días de la semana */}
                <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 pb-2">
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span>S</span>
                  <span>D</span>
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 text-center text-xs gap-y-2 pt-1 font-medium text-slate-700">
                  {/* Desfase de inicio de mes */}
                  {blanks.map((b) => (
                    <span key={`blank-${b}`} className="text-transparent select-none">
                      .
                    </span>
                  ))}

                  {/* Días activos */}
                  {monthDays.map((d) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const tieneExamenes = examenesPorFecha.has(dateStr);
                    const esHoy = isCurrentMonth && d === todayDay;

                    return (
                      <div
                        key={`day-${d}`}
                        onClick={() => abrirModalFecha(dateStr)}
                        className="flex flex-col items-center justify-center cursor-pointer group py-0.5 select-none"
                        title={
                          tieneExamenes
                            ? `Exámenes programados (${dateStr}) - Clic para ver detalles`
                            : esHoy
                            ? `Hoy (${dateStr})`
                            : `Fecha: ${dateStr}`
                        }
                      >
                        {esHoy ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#072B54] font-bold text-white shadow-xs group-hover:scale-105 transition-transform">
                            {d}
                          </span>
                        ) : (
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                              tieneExamenes
                                ? 'font-bold text-slate-900 group-hover:bg-slate-100'
                                : 'text-slate-700 group-hover:bg-slate-100'
                            }`}
                          >
                            {d}
                          </span>
                        )}

                        {/* Punto rojo indicador de fecha programada */}
                        {tieneExamenes ? (
                          <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                        ) : (
                          <span className="h-1 w-1 mt-0.5 opacity-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tarjeta Próximos Eventos (Exactamente los 3 más próximos) */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="bg-[#072B54] px-4 py-2.5 text-xs font-bold text-white flex items-center justify-between">
                <span>Próximos eventos</span>
                <span className="text-[10px] font-normal text-slate-300">
                  (Solo los 3 próximos)
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {proximos3Examenes.map((ex) => {
                  const partes = ex.fecha.split('-');
                  const mesNum = parseInt(partes[1], 10) - 1;
                  const mesAbr = MESES_ABREV[mesNum] ?? 'EXA';
                  const diaNum = partes[2] ?? '01';

                  return (
                    <div
                      key={ex.id}
                      onClick={() => abrirModalFecha(ex.fecha)}
                      className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      title="Clic para ver detalles de la fecha"
                    >
                      <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-3 min-w-[42px]">
                        <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-[#003770] transition-colors">
                          {mesAbr}
                        </span>
                        <span className="text-sm font-black text-[#DC2626] leading-tight">
                          {diaNum}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#003770] transition-colors">
                          {ex.materiaNombre}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ex.ambienteNombre} · {ex.horaInicio}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {proximos3Examenes.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No hay exámenes próximos registrados.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal de Detalle de Exámenes por Fecha */}
          <ExamenesFechaModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            fecha={selectedFecha}
            examenes={modalExamenes}
          />

          {/* SECCIÓN ENLACES */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-5 w-1 rounded-full bg-[#E30613]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Enlaces
              </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs divide-y divide-slate-100">
              <a
                href="https://drei.umss.edu.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#003770] hover:bg-slate-50 hover:underline transition-colors"
              >
                <span>DREI</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
              <a
                href="https://websis.umss.edu.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#003770] hover:bg-slate-50 hover:underline transition-colors"
              >
                <span>WEBSIS</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
              <a
                href="https://www.umss.edu.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#003770] hover:bg-slate-50 hover:underline transition-colors"
              >
                <span>Página UMSS</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
              <a
                href="https://epagos.umss.edu.bo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#003770] hover:bg-slate-50 hover:underline transition-colors"
              >
                <span>epagos</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
