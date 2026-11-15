// src/features/registro-ingresos/components/RegistrarCasoExcepcionalModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { formatHoraIngreso } from "../types/ingresos.types";
import {
  X,
  Search,
  Loader2,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { EstudianteInhabilitadoModal } from "./EstudianteInhabilitadoModal";
import {
  buscarEstudiantesExamen,
  registrarCasoExcepcional,
} from "../api/ingresos.service";
import type {
  ExamenControl,
  EstudianteExamenItem,
  Ingreso,
} from "../types/ingresos.types";

interface RegistrarCasoExcepcionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  examen: ExamenControl | null;
  ingresosActuales: Ingreso[];
  onCasoRegistrado: (nuevoIngreso: Ingreso) => void;
}

const MAX_MOTIVO_LENGTH = 50;

export function RegistrarCasoExcepcionalModal({
  isOpen,
  onClose,
  examen,
  ingresosActuales,
  onCasoRegistrado,
}: RegistrarCasoExcepcionalModalProps) {
  // Pasos: "formulario" (Paso 1) | "confirmacion" (Paso 2)
  const [paso, setPaso] = useState<"formulario" | "confirmacion">("formulario");

  // Estado del formulario
  const [codSisInput, setCodSisInput] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] =
    useState<EstudianteExamenItem | null>(null);
  const [motivo, setMotivo] = useState("");

  // Estado de búsqueda de SIS
  const [coincidencias, setCoincidencias] = useState<EstudianteExamenItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Errores de validación
  const [errorEstudiante, setErrorEstudiante] = useState<string | null>(null);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);

  // Modal de estudiante inhabilitado
  const [inhabilitadoModalOpen, setInhabilitadoModalOpen] = useState(false);
  const [estudianteInhabilitado, setEstudianteInhabilitado] =
    useState<EstudianteExamenItem | null>(null);

  // Envío
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda en tiempo real a medida que escribe el código SIS
  useEffect(() => {
    const q = codSisInput.trim();

    if (!q) {
      setCoincidencias([]);
      setShowDropdown(false);
      setBusquedaRealizada(false);
      setIsSearching(false);
      return;
    }

    // Si coincide exactamente con el seleccionado, no volver a buscar
    if (estudianteSeleccionado && estudianteSeleccionado.codSis === q) {
      setShowDropdown(false);
      return;
    }

    if (!examen) return;

    let isMounted = true;
    setIsSearching(true);
    setBusquedaRealizada(false);

    const timer = setTimeout(async () => {
      try {
        const results = await buscarEstudiantesExamen(examen.id, q);
        if (isMounted) {
          setCoincidencias(results);
          setShowDropdown(true);
          setBusquedaRealizada(true);
        }
      } catch {
        if (isMounted) {
          setCoincidencias([]);
          setShowDropdown(false);
          setErrorEstudiante("No se pudo consultar la nómina. Intenta nuevamente.");
        }
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [codSisInput, estudianteSeleccionado, examen]);

  const handleResetForm = () => {
    setPaso("formulario");
    setCodSisInput("");
    setEstudianteSeleccionado(null);
    setMotivo("");
    setCoincidencias([]);
    setShowDropdown(false);
    setBusquedaRealizada(false);
    setErrorEstudiante(null);
    setErrorMotivo(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    handleResetForm();
    onClose();
  };

  // Selección de un estudiante desde la lista de autocompletado
  const handleSeleccionarEstudiante = (item: EstudianteExamenItem) => {
    setShowDropdown(false);
    setErrorEstudiante(null);

    // Criterio HU-20: Si el estudiante está inhabilitado, abrir modal informativo
    if (!item.estadoHabilitado) {
      setEstudianteInhabilitado(item);
      setInhabilitadoModalOpen(true);
      return;
    }

    // Criterio Escenario Negativo 5: Estudiante ya registrado
    const yaRegistrado = ingresosActuales.find((ing) => ing.sis === item.codSis);
    if (yaRegistrado || item.yaIngreso) {
      setErrorEstudiante(
        `El estudiante ya cuenta con un ingreso registrado a las ${yaRegistrado ? formatHoraIngreso(yaRegistrado.hora, true) : item.horaIngresoPrevio || "hora registrada"} (Método: ${yaRegistrado?.metodo || item.metodoIngresoPrevio || "Manual"}).`
      );
      setEstudianteSeleccionado(null);
      return;
    }

    setCodSisInput(item.codSis);
    setEstudianteSeleccionado(item);
  };

  // Botón "Continuar" para pasar a la confirmación (Paso 1 -> Paso 2)
  const handleContinuar = () => {
    let hayError = false;

    if (!estudianteSeleccionado) {
      setErrorEstudiante("Selecciona un estudiante del examen.");
      hayError = true;
    }

    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setErrorMotivo("Ingresa el motivo del caso excepcional.");
      hayError = true;
    } else if (motivoLimpio.length > MAX_MOTIVO_LENGTH) {
      setErrorMotivo(`El motivo no debe superar los ${MAX_MOTIVO_LENGTH} caracteres.`);
      hayError = true;
    }

    if (hayError) return;

    setErrorEstudiante(null);
    setErrorMotivo(null);
    setPaso("confirmacion");
  };

  // Botón "Volver" desde la confirmación hacia el formulario (conserva datos)
  const handleVolverAlFormulario = () => {
    setPaso("formulario");
  };

  // Confirmar el registro final del caso
  const handleConfirmarRegistro = async () => {
    if (!examen || !estudianteSeleccionado || !motivo.trim()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nuevo = await registrarCasoExcepcional({
        examenId: examen.id,
        codigoSis: estudianteSeleccionado.codSis,
        motivo: motivo.trim(),
      });

      onCasoRegistrado(nuevo);
      handleResetForm();
      onClose();
    } catch (err) {
      const mensaje = isAxiosError<{ message?: string | string[] }>(err)
        ? err.response?.data?.message
        : undefined;
      toast.error(Array.isArray(mensaje) ? mensaje.join(". ") : mensaje || "No se pudo registrar el caso. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="w-[94vw] max-w-lg p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
          showCloseButton={false}
        >
          {/* ==============================================================
              PASO 1: Formulario "Registrar caso excepcional"
              ============================================================== */}
          {paso === "formulario" && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border/80 px-6 py-5">
                <div>
                  <DialogHeader className="p-0 text-left">
                    <DialogTitle className="text-xl font-bold text-foreground">
                      Registrar caso excepcional
                    </DialogTitle>
                  </DialogHeader>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deja constancia del motivo por el que un estudiante llegará tarde o no podrá asistir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contexto del examen */}
              <div className="px-6 pt-5">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                  <p className="text-sm font-semibold text-foreground">
                    {examen?.nombre || "Examen seleccionado"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {examen?.ambiente || "Ambiente no disponible"} ·{" "}
                    {examen?.horario || "Horario no disponible"}
                  </p>
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="px-6 py-4 flex flex-col gap-4">
                {/* Campo CÓDIGO SIS con buscador predictivo */}
                <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Código SIS
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Ingresa el código SIS"
                      value={codSisInput}
                      onChange={(e) => {
                        setCodSisInput(e.target.value);
                        setErrorEstudiante(null);
                        if (estudianteSeleccionado && estudianteSeleccionado.codSis !== e.target.value) {
                          setEstudianteSeleccionado(null);
                        }
                      }}
                      className="pl-9 pr-9 rounded-xl border-input bg-background text-sm"
                      aria-label="Código SIS"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Dropdown de coincidencias */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                      {coincidencias.length > 0 ? (
                        coincidencias.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">
                                {item.codSis}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.nombre} {item.apellido}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSeleccionarEstudiante(item)}
                              className="h-8 text-xs font-medium cursor-pointer"
                            >
                              Seleccionar
                            </Button>
                          </div>
                        ))
                      ) : busquedaRealizada ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No se encontraron estudiantes de este examen con ese código SIS.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {errorEstudiante && (
                    <p className="text-xs font-medium text-destructive mt-0.5">
                      {errorEstudiante}
                    </p>
                  )}
                </div>

                {/* Campos autocompletados (no editables) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Nombre
                    </label>
                    <Input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={estudianteSeleccionado?.nombre || ""}
                      placeholder="Se autocompleta con el código SIS"
                      className="rounded-xl border-border/80 bg-muted/50 text-foreground font-semibold text-sm cursor-default select-none focus-visible:ring-0 focus-visible:border-border/80"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Apellido
                    </label>
                    <Input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={estudianteSeleccionado?.apellido || ""}
                      placeholder="Se autocompleta con el código SIS"
                      className="rounded-xl border-border/80 bg-muted/50 text-foreground font-semibold text-sm cursor-default select-none focus-visible:ring-0 focus-visible:border-border/80"
                    />
                  </div>
                </div>

                {/* Campo CASO EXCEPCIONAL */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Caso excepcional
                    </label>
                    <span
                      className={`text-xs ${
                        motivo.length >= MAX_MOTIVO_LENGTH
                          ? "font-bold text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {motivo.length}/{MAX_MOTIVO_LENGTH}
                    </span>
                  </div>
                  <textarea
                    placeholder="Ej. Cita médica a las 08:00"
                    value={motivo}
                    maxLength={MAX_MOTIVO_LENGTH}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_MOTIVO_LENGTH) {
                        setMotivo(e.target.value);
                        setErrorMotivo(null);
                      }
                    }}
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    aria-label="Motivo del caso excepcional"
                  />
                  {errorMotivo && (
                    <p className="text-xs font-medium text-destructive mt-0.5">
                      {errorMotivo}
                    </p>
                  )}
                </div>
              </div>

              {/* Botones del pie */}
              <div className="flex items-center justify-end gap-3 border-t border-border/80 px-6 py-4 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="rounded-xl border-border px-5 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleContinuar}
                  className="rounded-xl bg-[#003770] hover:bg-[#002850] text-white px-6 py-2 text-sm font-medium cursor-pointer shadow-xs"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* ==============================================================
              PASO 2: Confirmación "Confirmar caso excepcional"
              ============================================================== */}
          {paso === "confirmacion" && (
            <div className="flex flex-col">
              {/* Header con botón volver */}
              <div className="px-6 pt-5 pb-2">
                <button
                  type="button"
                  onClick={handleVolverAlFormulario}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </button>
                <DialogHeader className="p-0 text-left">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    Confirmar caso excepcional
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="px-6 py-4 flex flex-col gap-4">
                {/* Tarjeta del estudiante */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {estudianteSeleccionado?.nombre} {estudianteSeleccionado?.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {estudianteSeleccionado?.codSis} · #{estudianteSeleccionado?.ci}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Habilitado
                    </span>
                  </div>
                </div>

                {/* Examen */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Examen
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {examen?.nombre}
                  </p>
                </div>

                {/* Caso excepcional */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Caso excepcional
                  </span>
                  <p className="text-sm text-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                    {motivo}
                  </p>
                </div>

                {/* Aviso informativo naranja */}
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    Se registrará el ingreso del estudiante y será visible para el personal de control.
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 border-t border-border/80 px-6 py-4 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVolverAlFormulario}
                  disabled={isSubmitting}
                  className="rounded-xl border-border px-5 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmarRegistro}
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#003770] hover:bg-[#002850] text-white px-6 py-2 text-sm font-medium cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Confirmar caso excepcional</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Estudiante Inhabilitado */}
      {estudianteInhabilitado && (
        <EstudianteInhabilitadoModal
          isOpen={inhabilitadoModalOpen}
          onClose={() => {
            setInhabilitadoModalOpen(false);
            setEstudianteInhabilitado(null);
          }}
          estudianteNombre={`${estudianteInhabilitado.nombre} ${estudianteInhabilitado.apellido}`}
          codigoSis={estudianteInhabilitado.codSis}
          motivoInhabilitacion={estudianteInhabilitado.motivoInhabilitacion}
        />
      )}
    </>
  );
}
