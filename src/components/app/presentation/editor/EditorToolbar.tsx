'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Play,
} from 'lucide-react';
import { InsertMenu } from './InsertMenu';
import type { SlideElementType, PresentationSettings, PresentationTheme } from '@/lib/types';

interface EditorToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  onAddElement: (type: SlideElementType) => void;
  currentSlideHasInteractive: boolean;
  settings: PresentationSettings;
  onUpdateSettings: (settings: Partial<PresentationSettings>) => void;
  theme: PresentationTheme;
  onUpdateTheme: (theme: Partial<PresentationTheme>) => void;
  presentationId?: string;
}

export function EditorToolbar({
  title,
  onTitleChange,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  onAddElement,
  currentSlideHasInteractive,
  presentationId,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border-b">
      {/* Back */}
      <Button variant="ghost" size="icon" asChild>
        <Link href="/host">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="max-w-[240px] h-8 text-sm font-medium border-transparent hover:border-input focus:border-input"
        placeholder="Presentation title"
      />

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Save */}
      <Button variant="ghost" size="sm" onClick={onSave} disabled={!isDirty}>
        <Save className="h-4 w-4 mr-1.5" />
        Save
      </Button>

      {/* Undo/Redo */}
      <div className="flex">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Insert menu */}
      <InsertMenu
        onInsert={onAddElement}
        disableInteractive={currentSlideHasInteractive}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Present button */}
      {presentationId && (
        <Button variant="gradient" size="sm" asChild>
          <Link href={`/host/presentation/edit/${presentationId}`}>
            <Play className="h-4 w-4 mr-1.5" />
            Present
          </Link>
        </Button>
      )}
    </div>
  );
}
