// src/shared/config/modules.ts
import {
  Users,
  Shield,
  ClipboardCheck,
  GraduationCap,
  Building2,
  ScanLine,
  ListChecks,
  AlertTriangle,
  UserCheck,
  QrCode,
} from "lucide-react";
import type { Modulo } from "@/shared/types/modulo";

export const modules: Modulo[] = [
  {
    clave: "usuarios",
    label: "Usuarios",
    ruta: "/usuarios",
    icon: Users,
  },
  {
    clave: "roles",
    label: "Roles",
    ruta: "/roles",
    icon: Shield,
  },
  {
    clave: "examenes",
    label: "Exámenes",
    ruta: "/examenes",
    icon: ClipboardCheck,
  },
  {
    clave: "estudiantes",
    label: "Estudiantes",
    ruta: "/estudiantes",
    icon: GraduationCap,
  },
  {
    clave: "ambientes",
    label: "Ambientes",
    ruta: "/ambientes",
    icon: Building2,
  },
  {
    clave: "control_ingreso",
    label: "Control de ingreso",
    ruta: "/control-ingreso",
    icon: ScanLine,
  },
  {
    clave: "registro_ingresos",
    label: "Registro de ingresos",
    ruta: "/ingresos",
    icon: ListChecks,
  },
  {
    clave: "incidencias",
    label: "Incidencias",
    ruta: "/incidencias",
    icon: AlertTriangle,
  },
  {
    clave: "colaboradores",
    label: "Colaboradores",
    ruta: "/colaboradores",
    icon: UserCheck,
  },
  {
    clave: "portal_estudiante",
    label: "Mis exámenes",
    ruta: "/portal",
    icon: QrCode,
  },
];