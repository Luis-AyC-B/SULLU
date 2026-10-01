"use client";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
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
                            {hasRechazados
                                ? `Carga procesada con ${resultado.rechazados} observaciones`
                                : "Carga de estudiantes completada exitosamente"}
                        </h4>
                        <p
                            className={`mt-1 text-xs ${hasRechazados ? "text-amber-800" : "text-emerald-800"
                                }`}
                        >
                            {resultado.insertadosOReutilizados > 0 && (
                                <span>
                                    Se vincularon <strong>{resultado.insertadosOReutilizados}</strong> estudiantes habilitados al examen.{" "}
                                </span>
                            )}
                            {hasRechazados && (
                                <span>
                                    <strong>{resultado.rechazados}</strong> fila(s) no se pudieron procesar.
                                </span>
                            )}
                        </p>
                        {hasRechazados && (
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline cursor-pointer"
                            >
                                <span>{showDetails ? "Ocultar detalles" : "Ver detalle de filas rechazadas"}</span>
                                {showDetails ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                )}
                            </button>
                        )}
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
            {/* Detalle expandible de filas rechazadas */}
            {showDetails && hasRechazados && (
                <div className="mt-4 border-t border-amber-200/80 pt-3">
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-white">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-amber-100/50 border-b border-amber-200 font-bold text-amber-900">
                                <tr>
                                    <th className="py-2 px-3">Fila #</th>
                                    <th className="py-2 px-3">Código</th>
                                    <th className="py-2 px-3">Estudiante</th>
                                    <th className="py-2 px-3">Motivo de rechazo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100 text-slate-700">
                                {resultado.filasRechazadas.map((rej, idx) => (
                                    <tr key={idx} className="hover:bg-amber-50/50">
                                        <td className="py-2 px-3 font-mono">{rej.fila}</td>
                                        <td className="py-2 px-3 font-mono">{rej.cod_sis || "—"}</td>
                                        <td className="py-2 px-3">{rej.nombre || "—"}</td>
                                        <td className="py-2 px-3 text-rose-600 font-medium">{rej.motivo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}