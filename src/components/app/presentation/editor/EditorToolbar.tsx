'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Play,
  Check,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InsertMenu } from './InsertMenu';
import { ThemeSelector } from './ThemeSelector';
import { TemplateSelector } from './TemplateSelector';
import { PresentationSettingsDialog } from './PresentationSettingsDialog';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import type { SlideElementType, PresentationSlide, PresentationSettings, PresentationTheme } from '@/lib/types';

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
  slides: PresentationSlide[];
  onApplyTemplate: (data: { slides: PresentationSlide[]; settings: PresentationSettings; theme: PresentationTheme }) => void;
  presentationId?: string;
  onPresent?: () => void | Promise<void>;
  onBack: () => void;
  description?: string;
  onDescriptionChange?: (description: string) => void;
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
  settings,
  onUpdateSettings,
  theme,
  onUpdateTheme,
  slides,
  onApplyTemplate,
  presentationId,
  onPresent,
  onBack,
  description,
  onDescriptionChange,
}: EditorToolbarProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleBackClick = () => {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      onBack();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-md bg-background/90 border-b border-border/50 overflow-x-auto">
        {/* Back */}
        <Button variant="ghost" size="icon" onClick={handleBackClick}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="max-w-[240px] h-8 text-sm font-medium border-transparent hover:border-input focus:border-input"
          placeholder="Presentation title"
        />

        {/* Divider */}
        <div className="w-px h-6 bg-border/50" />

        {/* Save */}
        <Button variant="ghost" size="sm" onClick={onSave} disabled={!isDirty}>
          {isDirty ? (
            <Save className="h-4 w-4 mr-1.5" />
          ) : (
            <Check className="h-4 w-4 mr-1.5 text-green-500" />
          )}
          {isDirty ? 'Save' : 'Saved'}
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
        <div className="w-px h-6 bg-border/50" />

        {/* Insert menu */}
        <InsertMenu
          onInsert={onAddElement}
          disableInteractive={currentSlideHasInteractive}
        />

        {/* Divider */}
        <div className="w-px h-6 bg-border/50" />

        {/* Theme, Templates, Settings — hidden on small screens */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeSelector theme={theme} onUpdate={onUpdateTheme} />
          <TemplateSelector onApply={onApplyTemplate} />
          <SaveTemplateDialog slides={slides} settings={settings} theme={theme} />
          <PresentationSettingsDialog
            settings={settings}
            onUpdate={onUpdateSettings}
            description={description}
            onDescriptionChange={onDescriptionChange}
          />
        </div>

        {/* Mobile overflow menu — visible on small screens */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <ThemeSelector theme={theme} onUpdate={onUpdateTheme} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <TemplateSelector onApply={onApplyTemplate} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <SaveTemplateDialog slides={slides} settings={settings} theme={theme} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <PresentationSettingsDialog
                    settings={settings}
                    onUpdate={onUpdateSettings}
                    description={description}
                    onDescriptionChange={onDescriptionChange}
                  />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Present button */}
        {presentationId && onPresent && (
          <Button
            variant="gradient"
            size="sm"
            className="shadow-lg shadow-primary/20"
            disabled={isLaunching}
            onClick={async () => {
              setIsLaunching(true);
              try {
                await onPresent();
              } catch {
                setIsLaunching(false);
              }
            }}
          >
            {isLaunching ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            Present
          </Button>
        )}
      </div>

      {/* Unsaved changes leave confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>Leave without saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
