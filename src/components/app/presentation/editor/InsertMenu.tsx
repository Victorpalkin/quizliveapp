'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Type,
  Image,
  Square,
  FileQuestion,
  Vote,
  MessageSquare,
  Star,
  Trophy,
  HelpCircle,
  Disc3,
  BarChart3,
} from 'lucide-react';
import type { SlideElementType } from '@/lib/types';

interface InsertMenuProps {
  onInsert: (type: SlideElementType) => void;
  disableInteractive: boolean;
}

export function InsertMenu({ onInsert, disableInteractive }: InsertMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Insert
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Content elements */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Content</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onInsert('text')}>
          <Type className="h-4 w-4 mr-2" />
          Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('image')}>
          <Image className="h-4 w-4 mr-2" />
          Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('shape')}>
          <Square className="h-4 w-4 mr-2" />
          Shape
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Interactive elements */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Interactive {disableInteractive && '(max 1 per slide)'}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onInsert('quiz')} disabled={disableInteractive}>
          <FileQuestion className="h-4 w-4 mr-2 text-purple-500" />
          Quiz Question
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('poll')} disabled={disableInteractive}>
          <Vote className="h-4 w-4 mr-2 text-teal-500" />
          Poll
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('thoughts')} disabled={disableInteractive}>
          <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
          Thoughts Gathering
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('rating')} disabled={disableInteractive}>
          <Star className="h-4 w-4 mr-2 text-orange-500" />
          Rating
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Results & special */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Results & Special</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onInsert('quiz-results')}>
          <BarChart3 className="h-4 w-4 mr-2 text-purple-400" />
          Quiz Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('poll-results')}>
          <BarChart3 className="h-4 w-4 mr-2 text-teal-400" />
          Poll Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('leaderboard')}>
          <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
          Leaderboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('qa')}>
          <HelpCircle className="h-4 w-4 mr-2 text-green-500" />
          Q&A Feed
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('spin-wheel')}>
          <Disc3 className="h-4 w-4 mr-2 text-pink-500" />
          Spin Wheel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
