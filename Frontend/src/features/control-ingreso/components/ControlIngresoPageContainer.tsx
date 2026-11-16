"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActiveExam } from "../store/useActiveExamStore";
import { controlIngresoService } from "../services/control-ingreso.service";
import { SeleccionExamenView } from "./seleccion/SeleccionExamenView";
import { ExamenActivoView } from "./activo/ExamenActivoView";

export function ControlIngresoPageContainer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { examenActivo, setExamenActivo } = useActiveExam();

  // Revalidar el estado del examen activo con el servidor para evitar datos obsoletos en sessionStorage
  useEffect(() => {
    if (examenActivo?.id && typeof navigator !== "undefined" && navigator.onLine) {
      controlIngresoService
        .getMisExamenes()
        .then((lista) => {
          const fresco = lista.find((e) => e.id === examenActivo.id);
          if (fresco) {
            setExamenActivo(fresco);
          }
        })
        .catch(() => {});
    }
  }, [examenActivo?.id, setExamenActivo]);

  const permisos = (session?.user?.permisos as string[]) || [];
  const tieneAcceso =
    permisos.length === 0 || // Durante desarrollo o si el token aún no hidrata permisos
    permisos.some(
      (p) =>
        p === "control_ingreso" ||
        p.startsWith("control_ingreso.") ||
        p === "usuarios.crear" // Administrador tiene acceso transversal
    );

  useEffect(() => {
    if (status === "authenticated" && !tieneAcceso) {
      router.replace("/unauthorized?modulo=control_ingreso");
    }
  }, [status, tieneAcceso, router]);

  if (status === "loading") {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#002D62] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "authenticated" && !tieneAcceso) {
    return null;
  }

  if (!examenActivo) {
    return <SeleccionExamenView />;
  }

  return <ExamenActivoView examen={examenActivo} />;
}
