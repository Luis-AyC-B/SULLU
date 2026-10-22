'use client';

import { Suspense, use } from 'react';
import { Loader2 } from 'lucide-react';
import { PublicExamQrView } from '@/features/portal/components/PublicExamQrView';

interface QrTokenPageProps {
  params: Promise<{ token: string }>;
}

function TokenResolver({ params }: QrTokenPageProps) {
  const resolvedParams = use(params);
  const token = decodeURIComponent(resolvedParams.token);

  return <PublicExamQrView token={token} />;
}

export default function QrTokenPage({ params }: QrTokenPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-10 w-10 animate-spin text-[#0B1B3D]" />
        </div>
      }
    >
      <TokenResolver params={params} />
    </Suspense>
  );
}
