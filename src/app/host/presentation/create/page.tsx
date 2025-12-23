'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useUser } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';

export default function CreatePresentationPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { createPresentation } = usePresentationMutations();

  useEffect(() => {
    // Redirect if not authenticated
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Create presentation and redirect to edit
    if (user) {
      createPresentation({
        title: 'Untitled Presentation',
        description: '',
        slides: [],
      })
        .then((presentationId) => {
          router.replace(`/host/presentation/edit/${presentationId}`);
        })
        .catch((error) => {
          console.error('Failed to create presentation:', error);
          router.push('/host');
        });
    }
  }, [user, userLoading, router, createPresentation]);

  return <FullPageLoader />;
}
