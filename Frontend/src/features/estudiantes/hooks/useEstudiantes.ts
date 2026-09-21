"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CreateEstudianteManualInput,
  EstudianteExamen,
  FiltroEstado,
  ResultadoCargaEstudiantes,
} from "../types/estudiante.types";
import { estudianteService } from "../api/estudiante.service";

export function useEstudiantes(examenId: number | null) {
  const [estudiantes, setEstudiantes] = useState<EstudianteExamen[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [resultadoCarga, setResultadoCarga] = useState<ResultadoCargaEstudiantes | null>(null);

  // Task 7: Carga real de estudiantes del examen desde la base de datos
  const fetchEstudiantes = useCallback(async () => {
    if (!examenId) {
      setEstudiantes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const resp = await estudianteService.getEstudiantesByExamen(examenId);
      if (resp && Array.isArray(resp.data)) {
        setEstudiantes(resp.data);
      } else {
        setEstudiantes([]);
      }
    } catch {
      setEstudiantes([]);
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

  // Task 10: Inhabilitar estudiante para este examen (PATCH /examenes/:examenId/estudiantes/:estudianteId/estado)
  const inhabilitarEstudiante = useCallback(
    async (estudianteId: number, motivo: string) => {
      if (!examenId) return;
      setIsSubmitting(true);
      try {
        await estudianteService.actualizarEstado(examenId, estudianteId, false, motivo);

        setEstudiantes((prev) =>
          prev.map((e) =>
            e.estudiante_id === estudianteId
              ? {
                  ...e,
                  estado_habilitado: false,
                  motivo_inhabilitacion: motivo,
                }
              : e
          )
        );
        toast.success("Estudiante inhabilitado para este examen");
      } catch (apiErr: unknown) {
        if (axios.isAxiosError(apiErr) && apiErr.response?.data?.message) {
          const msg = Array.isArray(apiErr.response.data.message)
            ? apiErr.response.data.message.join(", ")
            : apiErr.response.data.message;
          toast.error(msg);
        } else {
          toast.error("Error al inhabilitar el estudiante");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [examenId]
  );

  // Task 10: Habilitar estudiante para este examen
  const habilitarEstudiante = useCallback(
    async (estudianteId: number) => {
      if (!examenId) return;
      setIsSubmitting(true);
      try {
        await estudianteService.actualizarEstado(examenId, estudianteId, true);

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
      } catch (apiErr: unknown) {
        if (axios.isAxiosError(apiErr) && apiErr.response?.data?.message) {
          const msg = Array.isArray(apiErr.response.data.message)
            ? apiErr.response.data.message.join(", ")
            : apiErr.response.data.message;
          toast.error(msg);
        } else {
          toast.error("Error al habilitar el estudiante");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [examenId]
  );

  // Task 9: Registrar manualmente un estudiante en base de datos real (POST /examenes/:examenId/estudiantes)
  const addEstudianteManual = useCallback(
    async (input: CreateEstudianteManualInput) => {
      if (!examenId) {
        toast.error("Debes seleccionar un examen antes de registrar estudiantes");
        return false;
      }

      setIsSubmitting(true);
      try {
        const resp = await estudianteService.registrarManual(examenId, {
          cod_sis: input.cod_sis.trim(),
          nombre: input.nombre.trim(),
          apellido: input.apellido.trim(),
          ci: input.ci?.trim() || undefined,
        });

        if (resp?.estudiante) {
          setEstudiantes((prev) => [resp.estudiante, ...prev]);
          if (resp.advertencia) {
            toast.info(resp.advertencia);
          }
          toast.success(
            `Estudiante ${resp.estudiante.nombre} ${resp.estudiante.apellido} registrado exitosamente`
          );
          return true;
        }

        toast.error("Respuesta inválida del servidor");
        return false;
      } catch (apiErr: unknown) {
        if (axios.isAxiosError(apiErr) && apiErr.response?.data?.message) {
          const msg = Array.isArray(apiErr.response.data.message)
            ? apiErr.response.data.message.join(", ")
            : apiErr.response.data.message;
          toast.error(msg);
        } else {
          toast.error("No se pudo registrar el estudiante");
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [examenId]
  );

  // Task 8: Carga masiva por archivo CSV en base de datos real (POST /examenes/:examenId/estudiantes/masivo)
  const procesarArchivoCsv = useCallback(
    async (file: File) => {
      if (!examenId) {
        toast.error("Debes seleccionar un examen antes de subir estudiantes");
        return;
      }

      setIsSubmitting(true);
      try {
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith(".csv")) {
          throw new Error("Formato de archivo no soportado. Debe ser un archivo .csv");
        }

        // Validación preventiva en el front para evitar errores confusos del parser backend
        try {
          const previewText = await file.slice(0, 1024).text();
          const firstLine = previewText.split(/\r?\n/)[0]?.toLowerCase() || "";
          const hasNombre = firstLine.includes("nombre");
          const hasCodigo =
            firstLine.includes("cod") || firstLine.includes("codigo");
          if (!hasNombre && !hasCodigo) {
            throw new Error(
              "El archivo CSV debe incluir una primera fila de encabezados: nombre,apellidos,codigo (y opcional ci). Descarga la plantilla para usar el formato correcto."
            );
          }
        } catch (readErr) {
          if (
            readErr instanceof Error &&
            readErr.message.includes("encabezados")
          ) {
            throw readErr;
          }
        }

        const respBackend = await estudianteService.cargaMasiva(examenId, file);

        if (respBackend?.resumen) {
          setResultadoCarga({
            totalLeidos: respBackend.resumen.total_filas,
            insertadosOReutilizados: respBackend.resumen.vinculados_nuevos,
            rechazados: respBackend.resumen.rechazadas,
            filasRechazadas: respBackend.rechazados.map((r) => ({
              fila: r.fila,
              cod_sis: r.cod_sis || undefined,
              motivo: r.motivo,
            })),
          });

          await fetchEstudiantes();

          if (respBackend.resumen.rechazadas > 0 && respBackend.resumen.vinculados_nuevos > 0) {
            toast.warning(
              `Se vincularon ${respBackend.resumen.vinculados_nuevos} estudiantes. ${respBackend.resumen.rechazadas} fila(s) fueron rechazadas.`
            );
          } else if (
            respBackend.resumen.rechazadas > 0 &&
            respBackend.resumen.vinculados_nuevos === 0
          ) {
            toast.error(
              `No se pudo vincular ninguna fila. ${respBackend.resumen.rechazadas} rechazada(s).`
            );
          } else {
            toast.success(
              `Se vincularon ${respBackend.resumen.vinculados_nuevos} estudiantes exitosamente.`
            );
          }
        }
      } catch (apiErr: unknown) {
        if (axios.isAxiosError(apiErr) && apiErr.response?.data?.message) {
          const msg = Array.isArray(apiErr.response.data.message)
            ? apiErr.response.data.message.join(", ")
            : apiErr.response.data.message;
          toast.error(msg);
        } else if (apiErr instanceof Error) {
          toast.error(apiErr.message);
        } else {
          toast.error("Error al procesar el archivo en el servidor");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [examenId, fetchEstudiantes]
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
