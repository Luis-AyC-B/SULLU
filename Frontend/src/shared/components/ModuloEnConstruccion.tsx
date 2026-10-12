import { Construction } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";

export function ModuloEnConstruccion({ titulo, hus }: { titulo: string; hus?: string }) {
  return (
    <PageContainer title={titulo} subtitle={hus ? `Aquí se implementará ${hus}` : "Próximamente"}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Construction className="size-10 text-secondary" />
        <p className="font-semibold">Módulo en construcción</p>
      </div>
    </PageContainer>
  );
}