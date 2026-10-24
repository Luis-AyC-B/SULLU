'use client';

import { useRouter } from 'next/navigation';
import { ProfileSetupView } from './ProfileSetupView';

export function ProfilePageContainer() {
  const router = useRouter();
  return <ProfileSetupView onContinue={() => router.push('/portal')} />;
}