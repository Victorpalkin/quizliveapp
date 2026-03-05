'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { usePresentationById } from '@/firebase/presentation';
import { PresentationEditor } from '@/components/app/presentation/editor/PresentationEditor';

export default function EditPresentationPage() {
  const { presentationId } = useParams<{ presentationId: string }>();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { presentation, loading: presLoading } = usePresentationById(presentationId);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const loading = userLoading || presLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Presentation not found</p>
      </div>
    );
  }

  return <PresentationEditor presentation={presentation} />;
}
