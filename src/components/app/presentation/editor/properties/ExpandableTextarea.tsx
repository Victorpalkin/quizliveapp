'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Maximize2 } from 'lucide-react';

interface ExpandableTextareaProps
  extends React.ComponentProps<typeof Textarea> {
  label?: string;
}

export function ExpandableTextarea({
  label,
  value,
  onChange,
  ...props
}: ExpandableTextareaProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    if (open) setDraft(String(value ?? ''));
  }, [open, value]);

  const handleSave = () => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: draft },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
  };

  return (
    <>
      <div className="relative group">
        <Textarea value={value} onChange={onChange} {...props} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity bg-background/80"
          title="Expand editor"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label || 'Edit Text'}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            className="text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
