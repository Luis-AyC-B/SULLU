import { apiClient } from "@/shared/lib/api-client";
import {
  Usuario,
  CreateUsuarioInput,
  UpdateUsuarioInput,
  ReactivarUsuarioInput,
  CreateUsuarioResponse,
  CatalogoAcademico,
} from "../types/user.types";

const BASE_URL = "/usuarios";

export const userService = {
  /** Lista todos los usuarios (el backend excluye o marca los deletedAt según filtro) */
  getAll: async (): Promise<Usuario[]> => {
    const { data } = await apiClient.get<{ data?: Usuario[] }>(BASE_URL);
    return data.data || (data as unknown as Usuario[]) || [];
  },

  getById: async (id: number): Promise<Usuario> => {
    const { data } = await apiClient.get<Usuario>(`${BASE_URL}/${id}`);
    return data;
  },

  /**
   * Crea un usuario. Si el correo pertenece a una cuenta con deletedAt != null,
   * el backend responde con reactivado: true en vez de crear un registro nuevo.
   */
  create: async (
    payload: CreateUsuarioInput
  ): Promise<CreateUsuarioResponse> => {
    const { data } = await apiClient.post<CreateUsuarioResponse>(
      BASE_URL,
      payload
    );
    return data;
  },

  update: async (payload: UpdateUsuarioInput): Promise<Usuario> => {
    const { id, ...rest } = payload;
    const { data } = await apiClient.patch<Usuario>(
      `${BASE_URL}/${id}`,
      rest
    );
    return data;
  },

  /** Soft delete: el backend setea deletedAt, no borra el registro físicamente */
  deactivate: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  /** Reingreso explícito de una cuenta inhabilitada, reusando el correo existente */
  reactivate: async (
    payload: ReactivarUsuarioInput
  ): Promise<CreateUsuarioResponse> => {
    const { data } = await apiClient.post<CreateUsuarioResponse>(
      `${BASE_URL}/reactivar`,
      payload
    );
    return data;
  },

  getCatalogosAcademicos: async (): Promise<CatalogoAcademico> => {
    const { data } = await apiClient.get<CatalogoAcademico>(`${BASE_URL}/catalogos/academicos`);
    return data;
  },
};