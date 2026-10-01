'use client';

import { useState, useEffect } from 'react';
import { LoginPublicNavbar } from '@/features/auth/components/LoginPublicNavbar';
import { WelcomeHero } from '@/features/auth/components/WelcomeHero';
import { LoginPublicContent } from '@/features/auth/components/LoginPublicContent';
import { LoginPublicHelp } from '@/features/auth/components/LoginPublicHelp';
import { LoginPublicFooter } from '@/features/auth/components/LoginPublicFooter';
import { LoginModal } from '@/features/auth/components/LoginModal';

/**
 * Página Principal / Bienvenida de ExaControl (HU 5)
 * Renderiza la pantalla institucional de bienvenida completa (media_1789852716106.png).
 * Al pulsar "Iniciar sesión" (Navbar) o "Acceder al sistema →" (Hero),
 * abre el modal de login desenfocando el fondo (media_1789852730507.png).
 */
export default function LoginPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'login') {
        setIsLoginModalOpen(true);
      }
    }
  }, []);

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA] text-slate-800 antialiased selection:bg-[#003770] selection:text-white">
      {/* 1. Barra de Navegación Pública Superior */}
      <LoginPublicNavbar onOpenLogin={handleOpenLogin} />

      {/* 2. Hero con foto de campus UMSS auténtica y botón interactivo */}
      <WelcomeHero onOpenLogin={handleOpenLogin} />

      {/* 3. Contenido Principal */}
      <main className="flex-1">
        {/* Noticias e informaciones, Calendario institucional y Enlaces */}
        <LoginPublicContent />

        {/* Soporte técnico, correo y redes sociales */}
        <LoginPublicHelp />
      </main>

      {/* 4. Footer Institucional */}
      <LoginPublicFooter />

      {/* 5. Modal de Inicio de Sesión con desenfoque de fondo */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseLogin}
      />
    </div>
  );
}