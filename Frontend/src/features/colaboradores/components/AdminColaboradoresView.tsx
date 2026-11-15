"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Colaborador } from "../schemas/colaborador.schema";

interface AdminColaboradoresViewProps {
  todosAdmin: Colaborador[];
}

export function AdminColaboradoresView({
  todosAdmin,
}: AdminColaboradoresViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filtro de tabla con buscador
  const colaboradoresFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return todosAdmin;
    return todosAdmin.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(term) ||
        (c.codSis && c.codSis.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        c.docenteNombre?.toLowerCase().includes(term)
    );
  }, [todosAdmin, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Buscador y contador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código SIS o docente"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-[#003770] focus:ring-1 focus:ring-[#003770] transition-colors shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="text-xs sm:text-sm text-gray-500 font-medium">
          {todosAdmin.length} colaboradores
        </div>
      </div>

      {/* Tarjeta con tabla de registro */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[#003770] text-sm sm:text-base">
            Registro de colaboradores
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {colaboradoresFiltrados.length} colaboradores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-semibold text-xs">
                <th className="py-3 px-5">Colaborador</th>
                <th className="py-3 px-5">Código SIS</th>
                <th className="py-3 px-5">Docente</th>
                <th className="py-3 px-5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {colaboradoresFiltrados.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/60 transition-colors"
                >
                  <td className="py-4 px-5">
                    <div className="font-bold text-[#003770]">{item.nombreCompleto}</div>
                  </td>
                  <td className="py-4 px-5 text-gray-700 font-mono font-medium">
                    {item.codSis || "—"}
                  </td>
                  <td className="py-4 px-5 text-slate-700 font-medium">
                    {item.docenteNombre}
                  </td>
                  <td className="py-4 px-5 text-gray-500">
                    {item.fechaSolicitud || item.fechaRespuesta || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
