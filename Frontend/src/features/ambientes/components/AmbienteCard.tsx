"use client";

import { Ambiente } from "../schemas/ambiente.schema";
import { AmbienteEstadoBadge } from "./AmbienteEstadoBadge";
import { Pencil } from "lucide-react";

interface AmbienteCardProps {
  ambiente: Ambiente;
  onVerDisponibilidad: (ambiente: Ambiente) => void;
  onEditar?: (ambiente: Ambiente) => void;
  canEdit?: boolean;
}

export function AmbienteCard({
  ambiente,
  onVerDisponibilidad,
  onEditar,
  canEdit = true,
}: AmbienteCardProps) {
  const isHabilitado =
    ambiente.estado.toUpperCase() === "HABILITADO" ||
    ambiente.estado.toUpperCase() === "DISPONIBLE";

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <AmbienteEstadoBadge estado={ambiente.estado} />

          {/* Botón de editar estado del aula (Pencil icon del mockup) */}
          {canEdit && onEditar && (
            <button
              type="button"
              onClick={() => onEditar(ambiente)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Editar estado del ambiente"
              aria-label={`Editar ambiente ${ambiente.nombre}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">
          {ambiente.facultad || "FCyT"}
        </p>

        <h3 className="text-xl font-bold text-foreground mb-3">
          {ambiente.nombre}
        </h3>

        <div className="text-sm text-muted-foreground space-y-1 mb-5">
          <p>
            <span className="font-medium text-foreground/80">Tipo:</span> {ambiente.tipoAula || "Aula común"}
          </p>
        </div>
      </div>

      <div>
        {/* TASK-10.6: Deshabilitar el botón cuando el ambiente no está Habilitado */}
        <button
          type="button"
          disabled={!isHabilitado}
          onClick={() => onVerDisponibilidad(ambiente)}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors border ${
            isHabilitado
              ? "border-primary/30 text-primary hover:bg-primary/5 active:bg-primary/10 cursor-pointer"
              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Ver disponibilidad
        </button>
      </div>
    </div>
  );
}
