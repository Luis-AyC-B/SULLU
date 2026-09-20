"use client";
import { useCallback, useEffect, useState } from "react";
import { ExamenItem } from "../types/estudiante.types";
import { estudianteService } from "../api/estudiante.service";
export const EXAMENES_MOCK: ExamenItem[] = [
    {
        id: 1,
        nombreMateria: "Cálculo II",
        sigla: "MAT-204",
        fecha: "06/09/2026",
    },
    {
        id: 2,
        nombreMateria: "Álgebra Lineal",
        sigla: "MAT-201",
        fecha: "12/09/2026",
    },
    {
        id: 3,
        nombreMateria: "Física I",
        sigla: "FIS-100",
        fecha: "18/09/2026",
    },
];
export function useExamenes() {
    const [examenes, setExamenes] = useState<ExamenItem[]>(EXAMENES_MOCK);
    const [selectedExamenId, setSelectedExamenId] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const fetchExamenes = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await estudianteService.getExamenes();
            if (Array.isArray(data) && data.length > 0) {
                setExamenes(data);
                setSelectedExamenId(data[0].id);
            } else {
                setExamenes(EXAMENES_MOCK);
                setSelectedExamenId(EXAMENES_MOCK[0].id);
            }
        } catch {
            // Si el backend aún no tiene el endpoint /examenes listo
            setExamenes(EXAMENES_MOCK);
            setSelectedExamenId(EXAMENES_MOCK[0].id);
        } finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchExamenes();
    }, [fetchExamenes]);
    const selectedExamen = examenes.find((e) => e.id === selectedExamenId) || examenes[0];
    return {
        examenes,
        selectedExamenId,
        setSelectedExamenId,
        selectedExamen,
        isLoading,
        refetch: fetchExamenes,
    };
}