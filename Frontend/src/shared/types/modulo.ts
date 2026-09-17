import type { LucideIcon } from "lucide-react";

export interface Modulo {
  clave: string;    // Identificador único, en minúsculas (ej: "usuarios")
  label: string;    // Texto visible en el sidebar (ej: "Usuarios")
  ruta: string;     // Ruta de navegación (ej: "/usuarios")
  icon: LucideIcon; // Componente de ícono de lucide-react
}