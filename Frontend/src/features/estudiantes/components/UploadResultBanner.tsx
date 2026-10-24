"use client";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X, Info } from "lucide-react";
import { ResultadoCargaEstudiantes } from "../types/estudiante.types";

interface UploadResultBannerProps {
    resultado: ResultadoCargaEstudiantes;
    onDismiss: () => void;
}

export function UploadResultBanner({
    resultado,
    onDismiss,
}: UploadResultBannerProps) {
    const [showDetails, setShowDetails] = useState(false);
    const hasRechazados = resultado.rechazados > 0;
    const creados = resultado.creados ?? resultado.insertadosOReutilizados;
    const omitidos = resultado.omitidos ?? 0;
    const conError = resultado.rechazados;

    return (
        <div
            className={`rounded-xl border p-4 sm:p-5 shadow-2xs transition-all ${hasRechazados
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-emerald-200 bg-emerald-50/70"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    {hasRechazados ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <h4
                            className={`text-sm font-bold ${hasRechazados ? "text-amber-900" : "text-emerald-900"
                                }`}
                        >
                            Resumen de importación: {creados} creados, {omitidos} omitidos, {conError} con error
                        </h4>
                        <div
                            className={`mt-1 text-xs space-y-1 ${hasRechazados ? "text-amber-800" : "text-emerald-800"
                                }`}
                        >
                            <p>
                                <strong>{creados}</strong> estudiante(s) creados y habilitados en este examen.{" "}
                                {omitidos > 0 && (
                                    <span>
                                        <strong>{omitidos}</strong> ya estaban registrados previamente.{" "}
                                    </span>
                                )}
                                {conError > 0 && (
                                    <span>
                                        <strong>{conError}</strong> fila(s) con error.
                                    </span>
                                )}
                            </p>
                            {resultado.pendientesCi && resultado.pendientesCi > 0 && (
                                <p className="text-amber-700 flex items-center gap-1">
                                    <Info className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                        {resultado.pendientesCi} estudiante(s) no incluyeron CI: se les asignó una contraseña temporal aleatoria (pendiente de CI).
                                    </span>
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:underline cursor-pointer"
                        >
                            <span>{showDetails ? "Ocultar detalle de filas" : "Ver detalle por fila (correos generados y estado)"}</span>
                            {showDetails ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label="Cerrar notificación"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Detalle expandible con el correo institucional generado */}
            {showDetails && (
                <div className="mt-4 border-t border-slate-200/80 pt-3">
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <th className="py-2 px-3">Fila #</th>
                                    <th className="py-2 px-3">Código SIS</th>
                                    <th className="py-2 px-3">Estudiante</th>
                                    <th className="py-2 px-3">CI</th>
                                    <th className="py-2 px-3">Correo Institucional Generado</th>
                                    <th className="py-2 px-3">Estado</th>
                                    <th className="py-2 px-3">Observación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {resultado.detalleFilas && resultado.detalleFilas.length > 0 ? (
                                    resultado.detalleFilas.map((det, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-3 font-mono">{det.fila ?? "—"}</td>
                                            <td className="py-2 px-3 font-mono font-medium">{det.cod_sis}</td>
                                            <td className="py-2 px-3">{det.nombre} {det.apellido}</td>
                                            <td className="py-2 px-3">{det.ci || <span className="text-amber-600 font-medium">Pendiente</span>}</td>
                                            <td className="py-2 px-3 font-mono text-slate-600">{det.correo}</td>
                                            <td className="py-2 px-3">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        det.estado === 'CREADO'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : det.estado === 'OMITIDO'
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : 'bg-rose-100 text-rose-800'
                                                    }`}
                                                >
                                                    {det.estado}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-slate-600 text-[11px]">{det.motivo || "—"}</td>
                                        </tr>
                                    ))
                                ) : (
                                    resultado.filasRechazadas.map((rej, idx) => (
                                        <tr key={idx} className="hover:bg-amber-50/50">
                                            <td className="py-2 px-3 font-mono">{rej.fila}</td>
                                            <td className="py-2 px-3 font-mono">{rej.cod_sis || "—"}</td>
                                            <td className="py-2 px-3">{rej.nombre || "—"}</td>
                                            <td className="py-2 px-3">—</td>
                                            <td className="py-2 px-3">—</td>
                                            <td className="py-2 px-3">
                                                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    ERROR
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-rose-600 font-medium">{rej.motivo}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
