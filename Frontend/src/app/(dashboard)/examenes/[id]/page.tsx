"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ExamRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/examenes/${id}/asistencia`);
    }
  }, [id, router]);

  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
