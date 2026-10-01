'use client';

import { Phone, Mail } from 'lucide-react';

/**
 * Sección de "Contacto y Ayuda"
 * Basada fielmente en media_1789852716106.png.
 */
export function LoginPublicHelp() {
  return (
    <section id="ayuda" className="bg-[#ECEEF1] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Cabecera centrada */}
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Contacto y Ayuda
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Si tienes problemas para acceder o necesitas soporte técnico, contacta a la Dirección de Tecnología Educativa.
          </p>
        </div>

        {/* 3 Tarjetas de Contacto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta 1: Soporte técnico */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Soporte técnico</h3>
            <a
              href="tel:+59122340000"
              className="mt-1.5 text-sm font-bold text-[#003770] hover:underline"
            >
              +591 2 234-0000
            </a>
            <p className="mt-1 text-[11px] text-slate-500">Lun-Vie 8:00-18:00</p>
          </div>

          {/* Tarjeta 2: Correo institucional */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Correo institucional</h3>
            <a
              href="mailto:examcontrol@uni.edu.bo"
              className="mt-1.5 text-sm font-bold text-[#003770] hover:underline"
            >
              examcontrol@uni.edu.bo
            </a>
            <p className="mt-1 text-[11px] text-slate-500">Respuesta en 24 horas</p>
          </div>

          {/* Tarjeta 3: Redes Sociales */}
          <div id="contacto" className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-xs border border-slate-200/70 hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-slate-900 mb-4">Redes Sociales</h3>
            <div className="flex items-center justify-center gap-3">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-xs hover:scale-110 hover:shadow-sm transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="https://telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-xs hover:scale-110 hover:shadow-sm transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.195 1.006.128.832.942z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DA1F2] text-white shadow-xs hover:scale-110 hover:shadow-sm transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077B5] text-white shadow-xs hover:scale-110 hover:shadow-sm transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xs hover:scale-110 hover:shadow-sm transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
