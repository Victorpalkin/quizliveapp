'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useUser } from '@/firebase';
import { usePresentationMutations, useUserTemplates } from '@/firebase/presentation';
import { TemplateSelector } from '@/components/app/presentation/editor/TemplateSelector';
import { PresentationSlide } from '@/lib/types';
import { Header } from '@/components/app/header';

export default function CreatePresentationPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { createPresentation } = usePresentationMutations();
  const { templates: userTemplates } = useUserTemplates();
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Handle template selection
  const handleSelectTemplate = useCallback(
    async (slides: PresentationSlide[], templateName?: string) => {
      if (!user || isCreating) return;

      setIsCreating(true);
      setShowTemplateSelector(false);

      try {
        const title = templateName
          ? `${templateName} - Copy`
          : 'Untitled Presentation';

        const presentationId = await createPresentation({
          title,
          description: '',
          slides,
        });

        router.replace(`/host/presentation/edit/${presentationId}`);
      } catch (error) {
        console.error('Failed to create presentation:', error);
        router.push('/host');
      }
    },
    [user, isCreating, createPresentation, router]
  );

  // Handle dialog close (go back to dashboard)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        router.push('/host');
      }
      setShowTemplateSelector(open);
    },
    [router]
  );

  if (userLoading) {
    return <FullPageLoader />;
  }

  if (isCreating) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={handleOpenChange}
        onSelectTemplate={handleSelectTemplate}
        userTemplates={userTemplates}
      />
    </div>
  );
}
