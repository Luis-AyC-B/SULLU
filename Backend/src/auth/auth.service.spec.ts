/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService (HU-05 Login y Autenticación)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Inicio de Sesión', () => {
    it('1. Éxito: Debe permitir el ingreso con credenciales válidas y devolver token/rol', async () => {
      const dto = { email: 'docente@umss.edu.bo', password: 'hash123' };
      const resultado = await service.login(dto);

      expect(resultado).toHaveProperty('access_token');
      expect(resultado.usuario.rol).toBe('Docente');
    });

    it('2. Error: Debe rechazar el acceso cuando faltan campos obligatorios', async () => {
      const dto = { email: '', password: '123' };

      await expect(service.login(dto)).rejects.toThrow(BadRequestException);
    });

    it('3. Error: Debe rechazar credenciales incorrectas con un mensaje neutro', async () => {
      const dto = { email: 'docente@umss.edu.bo', password: 'password_erroneo' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('4. Error: Debe denegar el acceso si el usuario está inactivo', async () => {
      const dto = { email: 'inactivo@umss.edu.bo', password: 'hash123' };

      await expect(service.login(dto)).rejects.toThrow('El usuario no está habilitado');
    });
  });

  describe('Recuperación de Contraseña', () => {
    it('5. Éxito: Debe responder con un mensaje neutro sin revelar existencia de correos', async () => {
      const respuesta = await service.solicitarRecuperacionContrasena('no_registrado@umss.edu.bo');

      expect(respuesta.mensaje).toContain('Si el correo está registrado');
    });
  });
});