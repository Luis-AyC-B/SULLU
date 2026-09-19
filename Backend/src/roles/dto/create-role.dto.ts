/* eslint-disable prettier/prettier */
/**
 * @file create-role.dto.ts
 * @description Define la estructura y aplica las validaciones de los datos de entrada para la creación de un nuevo rol dinámico, reflejando las reglas de negocio establecidas en el cliente.
 * @author Gustavo Montaño Cabrera
 * @project ExaControl
 */
import { IsString, IsNotEmpty, MaxLength, Matches, IsArray, ArrayMinSize, IsOptional } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede superar los 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-.()]+$/, { message: 'El nombre contiene caracteres no permitidos' })
  nombre!: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(1000, { message: 'La descripción no puede superar los 1000 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-.(),:]+$/, { message: 'La descripción contiene caracteres no permitidos' })
  descripcion!: string;

  @IsOptional()
  @IsString()
  plantillaBaseId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debes seleccionar al menos un permiso' })
  @IsString({ each: true })
  permisos!: string[];
}