'use client';

import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

/**
 * Contenido Principal de la Página de Bienvenida
 * Contiene la sección izquierda de "Noticias e informaciones"
 * y la sección derecha con el widget de "Calendario", "Próximos eventos" y "Enlaces".
 * Basado fielmente en media_1789852716106.png.
 */
export function LoginPublicContent() {
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
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          
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
                    Septiembre 2026
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-[#E30613]" />
                    Fechas programadas
                  </div>
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
                  {/* Semana 1: Septiembre 2026 inicia en Martes */}
                  <span className="text-transparent">.</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <div className="flex flex-col items-center">
                    <span>6</span>
                    <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                  </div>

                  {/* Semana 2 */}
                  <span>7</span>
                  <span>8</span>
                  <div className="flex items-center justify-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#072B54] font-bold text-white shadow-xs">
                      9
                    </span>
                  </div>
                  <span>10</span>
                  <span>11</span>
                  <div className="flex flex-col items-center">
                    <span>12</span>
                    <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span>13</span>
                    <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                  </div>

                  {/* Semana 3 */}
                  <span>14</span>
                  <span>15</span>
                  <span>16</span>
                  <span>17</span>
                  <span>18</span>
                  <span>19</span>
                  <div className="flex flex-col items-center">
                    <span>20</span>
                    <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                  </div>

                  {/* Semana 4 */}
                  <span>21</span>
                  <span>22</span>
                  <span>23</span>
                  <span>24</span>
                  <span>25</span>
                  <span>26</span>
                  <span>27</span>

                  {/* Semana 5 */}
                  <div className="flex flex-col items-center">
                    <span>28</span>
                    <span className="h-1 w-1 rounded-full bg-[#E30613] mt-0.5" />
                  </div>
                  <span>29</span>
                  <span>30</span>
                </div>
              </div>
            </div>

            {/* Tarjeta Próximos Eventos */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="bg-[#072B54] px-4 py-2.5 text-xs font-bold text-white">
                Próximos eventos
              </div>
              <div className="divide-y divide-slate-100">
                {/* Evento 1 */}
                <div className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-3 min-w-[42px]">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Sep</span>
                    <span className="text-sm font-black text-[#DC2626] leading-tight">06</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Cálculo II</h4>
                    <p className="text-[11px] text-slate-500">Sala 204 · 09:00</p>
                  </div>
                </div>

                {/* Evento 2 */}
                <div className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-3 min-w-[42px]">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Sep</span>
                    <span className="text-sm font-black text-[#DC2626] leading-tight">12</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Álgebra Lineal</h4>
                    <p className="text-[11px] text-slate-500">Sala 101 · 08:00</p>
                  </div>
                </div>

                {/* Evento 3 */}
                <div className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-3 min-w-[42px]">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Sep</span>
                    <span className="text-sm font-black text-[#DC2626] leading-tight">20</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Cálculo III</h4>
                    <p className="text-[11px] text-slate-500">Sala 204 · 14:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
