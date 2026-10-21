import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Credencial Digital · EXACONTROL UMSS',
  description: 'Verificación pública de credencial digital móvil y control de ingreso a exámenes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function QrVerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
