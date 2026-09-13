/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('UsuariosService (HU-03 Crear Usuarios y Roles)', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosService],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Creación de Usuario', () => {
    it('1. Éxito: Debe registrar un usuario con rol Docente correctamente', async () => {
      const dto = {
        nombre: 'Carlos Méndez',
        email: 'carlos@ejemplo.com',
        password: 'password123',
        rol: 'Docente' as const,
      };

      const resultado = await service.create(dto);

      expect(resultado.nombre).toBe('Carlos Méndez');
      expect(resultado.rol).toBe('Docente');
    });

    it('2. Error: Debe rechazar si falta un campo obligatorio', async () => {
      const dto = {
        nombre: '',
        email: 'test@ejemplo.com',
        password: '123',
        rol: 'Docente' as const,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('3. Error: Debe rechazar si el correo ya existe', async () => {
      const dto = {
        nombre: 'Duplicado',
        email: 'docente1@ejemplo.com',
        password: '123',
        rol: 'Docente' as const,
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('4. Error: Debe rechazar formatos de correo inválidos', async () => {
      const dto = {
        nombre: 'Formato Malo',
        email: 'correo_sin_arroba.com',
        password: '123',
        rol: 'Docente' as const,
      };

      await expect(service.create(dto)).rejects.toThrow('El formato del correo es inválido');
    });
  });
});