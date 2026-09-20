import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEstudiantesExamenDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['habilitado', 'inhabilitado'])
  estado?: 'habilitado' | 'inhabilitado';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 50;
}
