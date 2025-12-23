'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, HelpCircle, BarChart3, MessageSquare, Star } from 'lucide-react';
import { PresentationSlideType } from '@/lib/types';
import { getAddableSlideTypes } from '../slide-types';

const ICONS: Record<string, React.ReactNode> = {
  'Image': <Image className="h-6 w-6" />,
  'HelpCircle': <HelpCircle className="h-6 w-6" />,
  'BarChart3': <BarChart3 className="h-6 w-6" />,
  'MessageSquare': <MessageSquare className="h-6 w-6" />,
  'Star': <Star className="h-6 w-6" />,
  'Cloud': <MessageSquare className="h-6 w-6" />,
};

interface SlideTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: PresentationSlideType) => void;
}

export function SlideTypeSelector({
  open,
  onOpenChange,
  onSelect,
}: SlideTypeSelectorProps) {
  const addableTypes = getAddableSlideTypes();

  const handleSelect = (type: PresentationSlideType) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Slide</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {addableTypes.map((slideType) => (
            <Card
              key={slideType.type}
              className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => handleSelect(slideType.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted text-primary">
                    {ICONS[slideType.icon] || <Image className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{slideType.label}</h3>
                      {slideType.createsMultipleSlides && (
                        <Badge variant="secondary" className="text-xs">
                          2 slides
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {slideType.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
