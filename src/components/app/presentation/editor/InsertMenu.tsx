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

function IconCircle({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${className}`}>
      {children}
    </div>
  );
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
          <IconCircle className="bg-foreground/10 mr-2">
            <Type className="h-3.5 w-3.5" />
          </IconCircle>
          Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('image')}>
          <IconCircle className="bg-blue-500/10 mr-2">
            <Image className="h-3.5 w-3.5 text-blue-500" />
          </IconCircle>
          Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('shape')}>
          <IconCircle className="bg-gray-500/10 mr-2">
            <Square className="h-3.5 w-3.5 text-gray-500" />
          </IconCircle>
          Shape
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Interactive elements */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Interactive {disableInteractive && '(max 1 per slide)'}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onInsert('quiz')} disabled={disableInteractive}>
          <IconCircle className="bg-purple-500/10 mr-2">
            <FileQuestion className="h-3.5 w-3.5 text-purple-500" />
          </IconCircle>
          Quiz Question
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('poll')} disabled={disableInteractive}>
          <IconCircle className="bg-teal-500/10 mr-2">
            <Vote className="h-3.5 w-3.5 text-teal-500" />
          </IconCircle>
          Poll
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('thoughts')} disabled={disableInteractive}>
          <IconCircle className="bg-blue-500/10 mr-2">
            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
          </IconCircle>
          Thoughts Gathering
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('rating')} disabled={disableInteractive}>
          <IconCircle className="bg-orange-500/10 mr-2">
            <Star className="h-3.5 w-3.5 text-orange-500" />
          </IconCircle>
          Rating
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Results & special */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Results & Special</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onInsert('quiz-results')}>
          <IconCircle className="bg-purple-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
          </IconCircle>
          Quiz Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('poll-results')}>
          <IconCircle className="bg-teal-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-teal-400" />
          </IconCircle>
          Poll Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('leaderboard')}>
          <IconCircle className="bg-yellow-500/10 mr-2">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
          </IconCircle>
          Leaderboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('qa')}>
          <IconCircle className="bg-green-500/10 mr-2">
            <HelpCircle className="h-3.5 w-3.5 text-green-500" />
          </IconCircle>
          Q&A Feed
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('spin-wheel')}>
          <IconCircle className="bg-pink-500/10 mr-2">
            <Disc3 className="h-3.5 w-3.5 text-pink-500" />
          </IconCircle>
          Spin Wheel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
