"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    CreateEstudianteManualInput,
    EstudianteExamen,
    FiltroEstado,
    ResultadoCargaEstudiantes,
} from "../types/estudiante.types";
import { estudianteService } from "../api/estudiante.service";
import { parseEstudiantesCsv } from "../lib/csv-parser";


// Mock representativo del examen 1 (Cálculo II) según los mockups del requerimiento
const INITIAL_MOCK_POR_EXAMEN: Record<number, EstudianteExamen[]> = {
    1: [
        {
            estudiante_id: 101,
            cod_sis: "2021-10234",
            nombre: "Valentina",
            apellido: "Pérez",
            ci: "7891234",
            estado_habilitado: false,
            motivo_inhabilitacion: "No inscrito en la asignatura",
        },
        {
            estudiante_id: 102,
            cod_sis: "2020-08711",
            nombre: "Andrés",
            apellido: "González",
            ci: "8912345",
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        },
        {
            estudiante_id: 103,
            cod_sis: "2022-11582",
            nombre: "Mariana",
            apellido: "Rojas",
            ci: "9012345",
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        },
        {
            estudiante_id: 104,
            cod_sis: "2019-07003",
            nombre: "Diego",
            apellido: "Castillo",
            ci: "6789012",
            estado_habilitado: false,
            motivo_inhabilitacion: "Deuda administrativa",
        },
        {
            estudiante_id: 105,
            cod_sis: "2021-10899",
            nombre: "Sara",
            apellido: "Morales",
            ci: "7890123",
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        },
        {
            estudiante_id: 106,
            cod_sis: "2020-09100",
            nombre: "José",
            apellido: "Ramírez",
            ci: "5678901",
            estado_habilitado: false,
            motivo_inhabilitacion: null,
        },
        {
            estudiante_id: 107,
            cod_sis: "2022-12003",
            nombre: "Luisa",
            apellido: "Herrera",
            ci: "8901234",
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        },
        {
            estudiante_id: 108,
            cod_sis: "2018-05522",
            nombre: "Carlos",
            apellido: "Mendoza",
            ci: "4567890",
            estado_habilitado: false,
            motivo_inhabilitacion: null,
        },
    ],
    2: [], // Examen 2 (Álgebra Lineal): vacío inicialmente para probar la vista de carga masiva
    3: [],
};
export function useEstudiantes(examenId: number) {
    const [estudiantes, setEstudiantes] = useState<EstudianteExamen[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
    const [resultadoCarga, setResultadoCarga] = useState<ResultadoCargaEstudiantes | null>(null);
    // Carga de estudiantes del examen
    const fetchEstudiantes = useCallback(async () => {
        setIsLoading(true);
        try {
            const resp = await estudianteService.getEstudiantesByExamen(examenId);
            if (resp && Array.isArray(resp.data)) {
                setEstudiantes(resp.data);
            } else {
                setEstudiantes(INITIAL_MOCK_POR_EXAMEN[examenId] || []);
            }
        } catch {
            // Si el backend no responde o falla, usar el mock del examen
            setEstudiantes(INITIAL_MOCK_POR_EXAMEN[examenId] || []);
        } finally {
            setIsLoading(false);
        }
    }, [examenId]);
    useEffect(() => {
        setResultadoCarga(null);
        setSearchTerm("");
        setFiltroEstado("todos");
        fetchEstudiantes();
    }, [examenId, fetchEstudiantes]);
    // Inhabilitar estudiante para este examen
    const inhabilitarEstudiante = useCallback(
        async (estudianteId: number, motivo?: string) => {
            setIsSubmitting(true);
            try {
                try {
                    await estudianteService.inhabilitar(examenId, estudianteId, motivo);
                } catch {
                    // Si el endpoint de backend aún no está conectado, actualizamos en el estado local
                }
                setEstudiantes((prev) =>
                    prev.map((e) =>
                        e.estudiante_id === estudianteId
                            ? {
                                ...e,
                                estado_habilitado: false,
                                motivo_inhabilitacion: motivo || null,
                            }
                            : e
                    )
                );
                toast.success("Estudiante inhabilitado para este examen");
            } catch {
                toast.error("Error al inhabilitar el estudiante");
            } finally {
                setIsSubmitting(false);
            }
        },
        [examenId]
    );
    // Habilitar estudiante para este examen
    const habilitarEstudiante = useCallback(
        async (estudianteId: number) => {
            setIsSubmitting(true);
            try {
                try {
                    await estudianteService.habilitar(examenId, estudianteId);
                } catch {
                    // Si el endpoint de backend aún no está conectado, actualizamos en el estado local
                }
                setEstudiantes((prev) =>
                    prev.map((e) =>
                        e.estudiante_id === estudianteId
                            ? {
                                ...e,
                                estado_habilitado: true,
                                motivo_inhabilitacion: null,
                            }
                            : e
                    )
                );
                toast.success("Estudiante habilitado para este examen");
            } catch {
                toast.error("Error al habilitar el estudiante");
            } finally {
                setIsSubmitting(false);
            }
        },
        [examenId]
    );
    // Registrar manualmente un estudiante
    const addEstudianteManual = useCallback(
        async (input: CreateEstudianteManualInput) => {
            setIsSubmitting(true);
            try {
                // Verificar si ya existe en la lista local del examen
                const yaExiste = estudiantes.some(
                    (e) => e.cod_sis.toLowerCase() === input.cod_sis.trim().toLowerCase()
                );
                if (yaExiste) {
                    toast.error("El código ya está registrado en este examen");
                    return false;
                }
                let nuevoEstudiante: EstudianteExamen;
                try {
                    const resp = await estudianteService.registrarManual(examenId, {
                        ...input,
                        cod_sis: input.cod_sis.trim(),
                        nombre: input.nombre.trim(),
                        apellido: input.apellido.trim(),
                    });
                    if (resp?.estudiante) {
                        nuevoEstudiante = resp.estudiante;
                        if (resp.advertencia) {
                            toast.info(resp.advertencia);
                        }
                    } else {
                        throw new Error("Respuesta inválida");
                    }
                } catch {
                    // Fallback a simulación local si el backend no está disponible
                    nuevoEstudiante = {
                        estudiante_id: Math.floor(Math.random() * 10000) + 200,
                        cod_sis: input.cod_sis.trim(),
                        nombre: input.nombre.trim(),
                        apellido: input.apellido.trim(),
                        ci: input.ci?.trim() || null,
                        estado_habilitado: true,
                        motivo_inhabilitacion: null,
                    };
                }
                setEstudiantes((prev) => [nuevoEstudiante, ...prev]);
                toast.success(
                    `Estudiante ${nuevoEstudiante.nombre} ${nuevoEstudiante.apellido} añadido exitosamente`
                );
                return true;
            } catch {
                toast.error("No se pudo registrar el estudiante");
                return false;
            } finally {
                setIsSubmitting(false);
            }
        },
        [examenId, estudiantes]
    );
    // Procesar archivo CSV
    const procesarArchivoCsv = useCallback(
        async (file: File) => {
            setIsSubmitting(true);
            try {
                const existingCodes = new Set(estudiantes.map((e) => e.cod_sis));
                const { validos, resultado } = await parseEstudiantesCsv(file, existingCodes);
                // Intentar mandar al backend
                try {
                    await estudianteService.subirArchivo(examenId, file);
                } catch {
                    // Backend en progreso
                }
                // Agregar los válidos a la lista local
                setEstudiantes((prev) => [...prev, ...validos]);
                setResultadoCarga(resultado);
                if (resultado.rechazados > 0 && resultado.insertadosOReutilizados > 0) {
                    toast.warning(
                        `Se cargaron ${resultado.insertadosOReutilizados} estudiantes. ${resultado.rechazados} filas fueron rechazadas.`
                    );
                } else if (resultado.rechazados > 0 && resultado.insertadosOReutilizados === 0) {
                    toast.error(
                        `Ningún estudiante pudo ser procesado. ${resultado.rechazados} filas rechazadas.`
                    );
                } else {
                    toast.success(
                        `Se cargaron ${resultado.insertadosOReutilizados} estudiantes exitosamente.`
                    );
                }
                return resultado;
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : "Error al procesar el archivo";
                toast.error(errorMsg);
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [examenId, estudiantes]
    );
    // Estudiantes filtrados por término de búsqueda y estado
    const estudiantesFiltrados = useMemo(() => {
        return estudiantes.filter((est) => {
            // Filtro por estado
            if (filtroEstado === "habilitado" && !est.estado_habilitado) return false;
            if (filtroEstado === "inhabilitado" && est.estado_habilitado) return false;
            // Filtro por término de búsqueda
            if (!searchTerm.trim()) return true;
            const term = searchTerm.trim().toLowerCase();
            const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
            const codSis = est.cod_sis.toLowerCase();
            const ci = est.ci ? est.ci.toLowerCase() : "";
            return (
                nombreCompleto.includes(term) ||
                codSis.includes(term) ||
                ci.includes(term)
            );
        });
    }, [estudiantes, searchTerm, filtroEstado]);
    const totalEstudiantes = estudiantes.length;
    const totalHabilitados = estudiantes.filter((e) => e.estado_habilitado).length;
    return {
        estudiantes,
        estudiantesFiltrados,
        totalEstudiantes,
        totalHabilitados,
        isLoading,
        isSubmitting,
        searchTerm,
        setSearchTerm,
        filtroEstado,
        setFiltroEstado,
        resultadoCarga,
        setResultadoCarga,
        inhabilitarEstudiante,
        habilitarEstudiante,
        addEstudianteManual,
        procesarArchivoCsv,
        refetch: fetchEstudiantes,
    };
}


