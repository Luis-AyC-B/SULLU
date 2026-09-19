import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateAlcanceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  facultadId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  carreraId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  materiaId?: number;
}
