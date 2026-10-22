"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveExam } from "@/features/control-ingreso/store/useActiveExamStore";
import { EscanearQrModal } from "@/features/control-ingreso/components/escanear/EscanearQrModal";
import { RegistroManualModal } from "@/features/control-ingreso/components/manual/RegistroManualModal";

export default function EscanearQrPage() {
  const router = useRouter();
  const { examenActivo } = useActiveExam();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    if (!examenActivo) {
      router.replace("/control-ingreso");
    }
  }, [examenActivo, router]);

  if (!examenActivo) {
    return null;
  }

  return (
    <>
      <EscanearQrModal
        examen={examenActivo}
        isOpen={!isManualModalOpen}
        onClose={() => router.push("/control-ingreso")}
        onAbrirRegistroManual={() => setIsManualModalOpen(true)}
      />

      <RegistroManualModal
        examen={examenActivo}
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          router.push("/control-ingreso");
        }}
      />
    </>
  );
}
