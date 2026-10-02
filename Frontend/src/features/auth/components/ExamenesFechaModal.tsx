'use client';

import React, { useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Building2,
  UserCheck,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { ExamenPublico } from '../types/examenes-publicos.types';

interface ExamenesFechaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: string; // Formato 'YYYY-MM-DD' o fecha ISO
  examenes: ExamenPublico[];
}

export function ExamenesFechaModal({
  isOpen,
  onClose,
  fecha,
  examenes,
}: ExamenesFechaModalProps) {
  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Formatear la fecha en texto legible en español
  const formatearFechaLarga = (fechaStr: string) => {
    try {
      if (!fechaStr) return '';
      const [year, month, day] = fechaStr.split('-').map(Number);
      if (!year || !month || !day) return fechaStr;

      const dateObj = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      return fechaStr;
    }
  };

  const fechaTexto = formatearFechaLarga(fecha);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Contenedor del Modal */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Azul Marina Institucional */}
        <div className="bg-[#072B54] px-6 py-4 text-white flex items-center justify-between border-b border-[#051c38]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15">
              <Calendar className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Exámenes Programados
              </h3>
              <p className="text-xs text-slate-200 capitalize font-medium">
                {fechaTexto || 'Fecha seleccionada'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-4">
          {examenes.length > 0 ? (
            <>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {examenes.length}{' '}
                  {examenes.length === 1 ? 'examen encontrado' : 'exámenes encontrados'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Habilitaciones activas
                </span>
              </div>

              <div className="space-y-4">
                {examenes.map((ex) => (
                  <div
                    key={ex.id}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 hover:bg-white hover:border-[#003770]/40 hover:shadow-xs transition-all"
                  >
                    {/* Fila Principal: Nombre de la Materia y Tipo */}
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {ex.materiaNombre}
                        </h4>
                        <span className="inline-block mt-1 text-[11px] font-semibold text-[#003770] bg-[#003770]/10 px-2.5 py-0.5 rounded-full">
                          {ex.tipoExamen}
                        </span>
                      </div>

                      {/* Horario y Ambiente */}
                      <div className="flex flex-col sm:items-end text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Clock className="h-4 w-4 text-[#DC2626]" />
                          <span>
                            {ex.horaInicio} - {ex.horaFin}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 font-medium text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{ex.ambienteNombre}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fila Secundaria: Detalles Académicos y Docente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                      {/* Carrera y Facultad */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-700">
                          <GraduationCap className="h-4 w-4 text-[#003770] shrink-0" />
                          <span className="font-semibold text-slate-900">
                            {ex.carreraNombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 pl-6">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ex.facultadNombre}</span>
                        </div>
                      </div>

                      {/* Docente Responsable */}
                      <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Docente Titular / Responsable
                        </div>
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                          <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{ex.docente}</span>
                        </div>
                      </div>
                    </div>

                    {/* Normas o indicaciones específicas */}
                    {ex.normas && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-[11px] text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Instrucciones: </strong>
                          <span>{ex.normas}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Estado Vacío cuando no hay exámenes ese día */
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Calendar className="h-7 w-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-bold text-slate-800">
                  Sin exámenes programados
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No se registran evaluaciones masivas fijadas para el{' '}
                  <strong className="text-slate-700">{fechaTexto}</strong>.
                </p>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Las fechas con evaluaciones activas se destacan con un punto rojo en el calendario.
              </p>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            ExaControl · Sistema Oficial de Exámenes UMSS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#072B54] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#003770] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
