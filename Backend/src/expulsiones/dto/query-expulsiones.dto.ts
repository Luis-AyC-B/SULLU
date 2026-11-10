import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryExpulsionesDto {
  @IsString()
  @IsNotEmpty()
  examenId!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
