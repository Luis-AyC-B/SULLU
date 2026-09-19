/* eslint-disable prettier/prettier */
/**
 * Dev: Gustavo Montaño
 * Date: 18/09/2026
 * Funcionalidad: Decorador personalizado para etiquetar los permisos requeridos por cada endpoint (HU3 - Task 3bj).
 * @param permissions - Lista de permisos en formato de string (ej. 'roles.crear')
 * @return Metadata asignada al contexto de ejecución
 */
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);