import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CodigosQrService } from './codigos-qr.service';

@ApiTags('qr')
@Controller(['qr', 'codigos-qr'])
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

  @Get('validar')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consulta pública del estado del código QR para credencial digital' })
  @ApiQuery({ name: 'token', description: 'Token JWT o URL completa del QR', required: true })
  @ApiResponse({ status: 200, description: 'Estado de la credencial (VALIDO, EXPIRADO, REVOCADO, INVALIDO)' })
  validar(@Query('token') token: string, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.codigosQrService.validarQrPublico(token, ip);
  }

  @Get('foto')
  @ApiOperation({ summary: 'Sirve la fotografía activa del estudiante verificando el token QR' })
  @ApiQuery({ name: 'token', description: 'Token QR vigente', required: true })
  servirFoto(@Query('token') token: string, @Res() res: Response) {
    return this.codigosQrService.servirFotoQr(token, res);
  }
}
