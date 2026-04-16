'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Edit, Share2, Eye, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { LucideIcon } from 'lucide-react';

interface ContentCardProps {
  /** Unique ID for the content item */
  id: string;
  /** Display title */
  title: string;
  /** Description text (e.g. "5 questions · 2 days ago") */
  description: string;
  /** Icon component to display */
  icon: LucideIcon;
  /** Tailwind color class for the icon (e.g. "text-purple-500") */
  iconColor: string;
  /** Path to edit page */
  editPath: string;
  /** Async callback for hosting — renders a button with loading state */
  onHost?: (id: string) => void | Promise<void>;
  /** Alternative: render host button as a Link instead of async callback */
  hostHref?: string;
  /** Optional gradient class for the host button */
  hostGradient?: string;
  /** Callback when delete is confirmed */
  onDelete: (id: string) => void;
  /** Message shown in delete confirmation dialog */
  deleteMessage?: string;
  /** Optional preview callback */
  onPreview?: () => void;
  /** Label for the preview button */
  previewLabel?: string;
  /** Optional share callback */
  onShare?: () => void;
}

export function ContentCard({
  id,
  title,
  description,
  icon: Icon,
  iconColor,
  editPath,
  onHost,
  hostHref,
  hostGradient,
  onDelete,
  deleteMessage,
  onPreview,
  previewLabel = 'Preview',
  onShare,
}: ContentCardProps) {
  const [isHosting, setIsHosting] = useState(false);

  return (
    <Card variant="interactive" className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-3">
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          {onShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShare}
              title="Share"
              className="h-8 w-8 hover:bg-muted rounded-lg"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" title="Edit" className="h-8 w-8 hover:bg-muted rounded-lg">
            <Link href={editPath}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 hover:bg-muted rounded-lg">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Delete this item?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  {deleteMessage || `This action cannot be undone. This will permanently delete \u2018${title}\u2019.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end gap-2 p-4 pt-0">
        {hostHref ? (
          <Button asChild variant="gradient" className={`w-full ${hostGradient ? `bg-gradient-to-r ${hostGradient}` : ''}`}>
            <Link href={hostHref}>
              <Gamepad2 className="mr-2 h-4 w-4" /> Host Session
            </Link>
          </Button>
        ) : onHost ? (
          <Button
            variant="gradient"
            className={`w-full ${hostGradient ? `bg-gradient-to-r ${hostGradient}` : ''}`}
            disabled={isHosting}
            onClick={async () => {
              setIsHosting(true);
              try {
                await onHost(id);
              } catch {
                setIsHosting(false);
              }
            }}
          >
            {isHosting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gamepad2 className="mr-2 h-4 w-4" />
            )}
            Host Session
          </Button>
        ) : null}
        {onPreview && (
          <Button className="w-full" variant="outline" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" /> {previewLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
