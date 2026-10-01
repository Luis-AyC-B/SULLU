import { IsOptional, IsString } from 'class-validator';

export class QueryExamenesDto {
  @IsOptional()
  @IsString()
  q?: string;
}
