'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Ambiente, EstadoAmbiente } from '../schemas/ambiente.schema';
import { ambientesApi, GetAmbientesParams } from '../api/ambientes.api';
import { mensajeApi } from '../lib/integracion';
export function useAmbientes(initialParams?: GetAmbientesParams) {
  const { status, data: session } = useSession();
  const enabled = status === 'authenticated' && Boolean(session?.user?.permisos?.includes('ambientes.ver'));
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchAmbientes = useCallback(async () => {
    if (!enabled) { setAmbientes([]); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try { setAmbientes(await ambientesApi.getAmbientes(initialParams)); }
    catch (err) { setError(mensajeApi(err, 'Error al cargar ambientes.')); }
    finally { setIsLoading(false); }
  }, [enabled, initialParams]);
  useEffect(() => { void fetchAmbientes(); }, [fetchAmbientes]);
  const actualizarEstadoAmbiente = async (id: string | number, estado: EstadoAmbiente) => {
    const updated = await ambientesApi.updateEstadoAmbiente(id, estado);
    setAmbientes(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
  };
  const filtrados = useMemo(() => {
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return ambientes.filter(a => normalizar(a.nombre).includes(normalizar(searchTerm.trim())));
  }, [ambientes, searchTerm]);
  return { ambientes: filtrados, totalAmbientes: filtrados.length, searchTerm, setSearchTerm, isLoading, error, refetch: fetchAmbientes, actualizarEstadoAmbiente };
}
