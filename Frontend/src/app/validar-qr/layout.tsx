import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Credencial Digital · EXACONTROL UMSS',
  description: 'Verificación de credencial digital y control de ingreso a exámenes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ValidarQrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

