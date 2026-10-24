import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/shared/components/providers/SessionProvider";
import { Toaster } from "@/shared/components/ui/sonner";
import { ServiceWorkerRegister } from "@/features/portal/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <SessionProvider>
          <ServiceWorkerRegister />
          {children}
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
