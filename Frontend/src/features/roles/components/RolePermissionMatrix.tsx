// src/features/roles/components/RolePermissionMatrix.tsx
"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { modulosPermisos } from "../config/role-permissions.config";

interface RolePermissionMatrixProps {
  seleccionados: string[];
  onChange: (permisos: string[]) => void;
}

export function RolePermissionMatrix({
  seleccionados,
  onChange,
}: RolePermissionMatrixProps) {
  const toggle = (clave: string, marcado: boolean) => {
    if (marcado) {
      onChange([...seleccionados, clave]);
    } else {
      onChange(seleccionados.filter((c) => c !== clave));
    }
  };

  const toggleModulo = (
    permisoVer: string,
    accionesClaves: string[],
    marcado: boolean
  ) => {
    if (marcado) {
      if (!seleccionados.includes(permisoVer)) {
        onChange([...seleccionados, permisoVer]);
      }
    } else {
      const todas = [permisoVer, ...accionesClaves];
      onChange(seleccionados.filter((c) => !todas.includes(c)));
    }
  };

  return (
    <div>
      <p className="text-label mb-3 text-foreground">PERMISOS</p>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {modulosPermisos.map((modulo) => {
          const claveAcciones = modulo.acciones.map((a) => a.clave);
          const moduloActivo = seleccionados.includes(modulo.permisoVer.clave);

          return (
            <div key={modulo.clave}>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={moduloActivo}
                  onCheckedChange={(checked) =>
                    toggleModulo(modulo.permisoVer.clave, claveAcciones, !!checked)
                  }
                />
                <span className="text-label text-foreground">{modulo.label}</span>
              </label>

              <div className="mt-2 flex flex-col gap-2 pl-6">
                {modulo.acciones.map((accion) => (
                  <label
                    key={accion.clave}
                    className={`flex items-center gap-2 ${
                      !moduloActivo ? "opacity-40" : ""
                    }`}
                  >
                    <Checkbox
                      checked={seleccionados.includes(accion.clave)}
                      disabled={!moduloActivo}
                      onCheckedChange={(checked) =>
                        toggle(accion.clave, !!checked)
                      }
                    />
                    <span className="text-body text-muted-foreground">
                      {accion.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}