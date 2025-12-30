'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, HelpCircle, BarChart3, MessageSquare, Star, Trophy, LayoutGrid, PieChart, CheckCircle } from 'lucide-react';
import { PresentationSlideType } from '@/lib/types';
import { getAddableSlideTypes, SlideTypeDefinition } from '../slide-types';

const ICONS: Record<string, React.ReactNode> = {
  'Image': <Image className="h-5 w-5" />,
  'HelpCircle': <HelpCircle className="h-5 w-5" />,
  'BarChart3': <BarChart3 className="h-5 w-5" />,
  'MessageSquare': <MessageSquare className="h-5 w-5" />,
  'Star': <Star className="h-5 w-5" />,
  'Cloud': <MessageSquare className="h-5 w-5" />,
  'Trophy': <Trophy className="h-5 w-5" />,
  'LayoutGrid': <LayoutGrid className="h-5 w-5" />,
  'PieChart': <PieChart className="h-5 w-5" />,
  'CheckCircle': <CheckCircle className="h-5 w-5" />,
};

interface SlideGroup {
  name: string;
  description: string;
  types: PresentationSlideType[];
}

const SLIDE_GROUPS: SlideGroup[] = [
  {
    name: 'Content',
    description: 'Static presentation slides',
    types: ['content'],
  },
  {
    name: 'Quiz & Poll',
    description: 'Interactive questions',
    types: ['quiz', 'poll', 'quiz-results', 'poll-results'],
  },
  {
    name: 'Thoughts',
    description: 'Collect audience ideas',
    types: ['thoughts-collect'],
  },
  {
    name: 'Rating',
    description: 'Rate and compare items',
    types: ['rating-describe', 'rating-summary'],
  },
  {
    name: 'Summary',
    description: 'Results and rankings',
    types: ['leaderboard'],
  },
];

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

  // Group types by category
  const groupedTypes = useMemo(() => {
    const typeMap = new Map<PresentationSlideType, SlideTypeDefinition>();
    addableTypes.forEach((t) => typeMap.set(t.type, t));

    return SLIDE_GROUPS.map((group) => ({
      ...group,
      slideTypes: group.types
        .map((type) => typeMap.get(type))
        .filter((t): t is SlideTypeDefinition => t !== undefined),
    })).filter((group) => group.slideTypes.length > 0);
  }, [addableTypes]);

  const handleSelect = (type: PresentationSlideType) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Slide</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {groupedTypes.map((group) => (
            <div key={group.name}>
              <div className="mb-2">
                <h3 className="text-sm font-medium text-foreground">{group.name}</h3>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.slideTypes.map((slideType) => (
                  <Card
                    key={slideType.type}
                    className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={() => handleSelect(slideType.type)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-md bg-muted text-primary flex-shrink-0">
                          {ICONS[slideType.icon] || <Image className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-medium text-sm">{slideType.label}</h4>
                            {slideType.createsMultipleSlides && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {slideType.type === 'rating-describe' ? '3 slides' : '2 slides'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {slideType.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
