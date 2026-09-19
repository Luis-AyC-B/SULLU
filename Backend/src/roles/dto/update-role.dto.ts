/* eslint-disable prettier/prettier */
/**
 * @file update-role.dto.ts
 * @description Define la estructura de datos para la actualización de un rol dinámico, extendiendo las propiedades del DTO de creación mediante PartialType.
 * @author Gustavo Montaño Cabrera
 * @project ExaControl
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateRolDto } from './create-role.dto';

export class UpdateRolDto extends PartialType(CreateRolDto) {}