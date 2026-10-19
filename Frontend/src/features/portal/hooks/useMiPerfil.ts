'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMiPerfil } from '../api/student-profile.service';
import type { PerfilEstudiante } from '../types/student-profile.types';

export function useMiPerfil() {
  const [perfil, setPerfil] = useState<PerfilEstudiante | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setPerfil(await getMiPerfil());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Aplica cambios al perfil en pantalla (p. ej. la foto recién subida o el perfil devuelto al guardar). */
  const actualizar = useCallback((cambios: Partial<PerfilEstudiante>) => {
    setPerfil((actual) => (actual ? { ...actual, ...cambios } : actual));
  }, []);

  /** Vuelve a pedir el perfil sin mostrar el estado de carga; si falla, conserva lo que ya hay. */
  const refrescar = useCallback(async () => {
    try {
      setPerfil(await getMiPerfil());
    } catch {
      // Se conserva el perfil actual.
    }
  }, []);

  return { perfil, isLoading, hasError, retry: load, actualizar, refrescar };
}