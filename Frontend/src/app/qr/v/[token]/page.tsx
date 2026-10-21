'use client';

import { Suspense, use } from 'react';
import { Loader2 } from 'lucide-react';
import { ContenidoValidarQr } from '@/app/validar-qr/page';

interface QrTokenPageProps {
  params: Promise<{ token: string }>;
}

function TokenResolver({ params }: QrTokenPageProps) {
  const resolvedParams = use(params);
  const token = decodeURIComponent(resolvedParams.token);

  return <ContenidoValidarQr tokenOverride={token} />;
}

export default function QrTokenPage({ params }: QrTokenPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <TokenResolver params={params} />
    </Suspense>
  );
}
