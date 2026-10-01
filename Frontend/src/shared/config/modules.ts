// src/shared/config/modules.ts
import { 
  Users, 
  Shield, 
  ClipboardCheck, 
  GraduationCap 
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
];