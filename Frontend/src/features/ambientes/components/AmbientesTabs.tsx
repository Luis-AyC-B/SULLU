"use client";

interface AmbientesTabsProps {
  tabActiva: "todos" | "mis-reservas";
  onTabChange: (tab: "todos" | "mis-reservas") => void;
}

export function AmbientesTabs({ tabActiva, onTabChange }: AmbientesTabsProps) {
  return (
    <div className="flex border-b border-border/80 gap-6">
      <button
        type="button"
        onClick={() => onTabChange("todos")}
        className={`pb-3 text-sm font-semibold transition-colors relative ${
          tabActiva === "todos"
            ? "text-primary border-b-2 border-primary -mb-px"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Todos
      </button>

      <button
        type="button"
        onClick={() => onTabChange("mis-reservas")}
        className={`pb-3 text-sm font-semibold transition-colors relative ${
          tabActiva === "mis-reservas"
            ? "text-primary border-b-2 border-primary -mb-px"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Mis reservas
      </button>
    </div>
  );
}
