'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    section: 'General',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Save' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    section: 'Elements',
    items: [
      { keys: ['Delete'], description: 'Delete selected element' },
      { keys: ['Ctrl', 'C'], description: 'Copy element' },
      { keys: ['Ctrl', 'V'], description: 'Paste element' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate element' },
      { keys: ['Arrow keys'], description: 'Nudge element (1%)' },
      { keys: ['Shift', 'Arrow'], description: 'Nudge element (5%)' },
    ],
  },
  {
    section: 'Canvas',
    items: [
      { keys: ['Ctrl', 'Scroll'], description: 'Zoom in/out' },
      { keys: ['Ctrl', '0'], description: 'Reset zoom' },
      { keys: ['Shift', 'Click'], description: 'Multi-select elements' },
      { keys: ['Shift', 'Drag'], description: 'Disable snap guides' },
    ],
  },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {shortcuts.map((section) => (
            <div key={section.section}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.section}
              </h4>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between text-sm">
                    <span>{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="px-1.5 py-0.5 text-xs bg-muted border rounded font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
