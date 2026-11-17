import { IsISO8601, Matches } from 'class-validator';

export class RestaurarRespaldoDto {
  @IsISO8601({ strict: true, strictSeparator: true })
  fechaHora!: string;

  @Matches(/^exacontrol_\d{8}T\d{6}Z_\d+\.dump$/)
  archivo!: string;
}
