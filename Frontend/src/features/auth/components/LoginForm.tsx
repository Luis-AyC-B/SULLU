'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '../schemas/login.schema';
import { useLogin } from '../hooks/useLogin';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export function LoginForm() {
  const { login } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(login)} className="space-y-4 max-w-sm">
      <Input placeholder="Correo" {...register('email')} />
      {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}

      <Input type="password" placeholder="Contraseña" {...register('password')} />
      {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}

      <Button type="submit" className="w-full">Iniciar sesión</Button>
    </form>
  );
}