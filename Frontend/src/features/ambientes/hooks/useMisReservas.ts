"use client";

import { useState, useEffect, useCallback } from "react";
import { Reserva } from "../schemas/reserva.schema";
import { reservasApi } from "../api/reservas.api";

export function useMisReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await reservasApi.getMisReservas();
      setReservas(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar tus reservas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  const cancelarReserva = async (reservaId: string | number) => {
    await reservasApi.cancelarReserva(reservaId);
    setReservas((prev) => prev.filter((r) => String(r.id) !== String(reservaId)));
  };

  return {
    reservas,
    isLoading,
    error,
    refetch: fetchReservas,
    cancelarReserva,
  };
}
