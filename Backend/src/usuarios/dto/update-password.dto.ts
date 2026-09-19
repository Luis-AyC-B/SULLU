import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'nuevaClave123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
