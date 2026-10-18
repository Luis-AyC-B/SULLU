'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMisExamenes } from '../api/student-exam.service';
import type { ExamenEstudiante } from '../types/student-exam.types';

export function useStudentExams() {
  const [examenes, setExamenes] = useState<ExamenEstudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setExamenes(await getMisExamenes());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { examenes, isLoading, hasError, retry: load };
}