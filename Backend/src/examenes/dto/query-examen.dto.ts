import { IsOptional, IsString } from 'class-validator';

export class QueryExamenDto {
  @IsOptional()
  @IsString()
  materiaId?: string;

  @IsOptional()
  @IsString()
  carreraId?: string;

  @IsOptional()
  @IsString()
  facultadId?: string;
}
