'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Presentation, Play, Pencil, Trash2, MoreVertical, Image as ImageIcon, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Presentation as PresentationType } from '@/lib/types';

interface PresentationCardProps {
  presentation: PresentationType;
  onHost: (presentationId: string) => void;
  onPreview?: (presentation: PresentationType) => void;
  onDelete: (presentationId: string) => void;
}

export function PresentationCard({ presentation, onHost, onPreview, onDelete }: PresentationCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const slideCount = presentation.slides?.length || 0;
  const firstContentSlide = presentation.slides?.find((s) => s.type === 'content' && s.imageUrl);
  const interactiveSlideCount = presentation.slides?.filter((s) => s.type !== 'content').length || 0;

  return (
    <>
      <Card variant="interactive" className="flex flex-col">
        <CardHeader className="p-4 pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <Presentation className="h-4 w-4 text-indigo-500" />
              </div>
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {presentation.title || 'Untitled Presentation'}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/host/presentation/edit/${presentation.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="text-sm mt-1">
            {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
            {interactiveSlideCount > 0 && (
              <span className="text-primary">
                {' '}
                ({interactiveSlideCount} interactive)
              </span>
            )}
          </CardDescription>
        </CardHeader>

        {/* Thumbnail preview */}
        <div className="px-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {firstContentSlide?.imageUrl ? (
              <img
                src={firstContentSlide.imageUrl}
                alt="First slide"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">No preview</span>
              </div>
            )}
          </div>
        </div>

        <CardContent className="flex-grow flex flex-col justify-end gap-2 p-4 pt-3">
          <Button
            variant="gradient"
            className="w-full"
            onClick={() => onHost(presentation.id)}
          >
            <Play className="mr-2 h-4 w-4" />
            Present
          </Button>
          {onPreview && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onPreview(presentation)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Presentation
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-semibold">
              Delete presentation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This will permanently delete &quot;{presentation.title}&quot; and all its slides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(presentation.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
