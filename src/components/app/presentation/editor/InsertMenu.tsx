'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Type,
  Image,
  Square,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  Minus,
  RectangleHorizontal,
  FileQuestion,
  Vote,
  MessageSquare,
  Star,
  Trophy,
  HelpCircle,
  Disc3,
  BarChart3,
  ClipboardList,
  Spline,
  MoveRight,
  GitBranch,
  Workflow,
} from 'lucide-react';
import type { SlideElement, SlideElementType } from '@/lib/types';

interface InsertMenuProps {
  onInsert: (type: SlideElementType, overrides?: Partial<SlideElement>) => void;
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

        {/* Shape sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconCircle className="bg-gray-500/10 mr-2">
              <Square className="h-3.5 w-3.5 text-gray-500" />
            </IconCircle>
            Shape
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'rectangle' })}>
              <Square className="h-4 w-4 mr-2 text-gray-500" />
              Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'circle' })}>
              <Circle className="h-4 w-4 mr-2 text-gray-500" />
              Circle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'rounded-rect' })}>
              <RectangleHorizontal className="h-4 w-4 mr-2 text-gray-500" />
              Rounded Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'triangle' })}>
              <Triangle className="h-4 w-4 mr-2 text-gray-500" />
              Triangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'diamond' })}>
              <Diamond className="h-4 w-4 mr-2 text-gray-500" />
              Diamond
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'arrow-right' })}>
              <ArrowRight className="h-4 w-4 mr-2 text-gray-500" />
              Arrow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('shape', { shapeType: 'line' })}>
              <Minus className="h-4 w-4 mr-2 text-gray-500" />
              Line
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Connector sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconCircle className="bg-emerald-500/10 mr-2">
              <Spline className="h-3.5 w-3.5 text-emerald-500" />
            </IconCircle>
            Connector
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem onClick={() => onInsert('connector', {
              connectorConfig: {
                routingType: 'straight',
                startX: 20, startY: 50, endX: 80, endY: 50,
                startArrow: 'none', endArrow: 'arrow',
                strokeColor: '#64748b', strokeWidth: 2, strokeStyle: 'solid',
              },
            })}>
              <MoveRight className="h-4 w-4 mr-2 text-emerald-500" />
              Straight Line
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('connector', {
              connectorConfig: {
                routingType: 'elbow',
                startX: 20, startY: 30, endX: 80, endY: 70,
                startArrow: 'none', endArrow: 'arrow',
                strokeColor: '#64748b', strokeWidth: 2, strokeStyle: 'solid',
              },
            })}>
              <GitBranch className="h-4 w-4 mr-2 text-emerald-500" />
              Elbow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert('connector', {
              connectorConfig: {
                routingType: 'curved',
                startX: 20, startY: 30, endX: 80, endY: 70,
                startArrow: 'none', endArrow: 'arrow',
                strokeColor: '#64748b', strokeWidth: 2, strokeStyle: 'solid',
              },
            })}>
              <Spline className="h-4 w-4 mr-2 text-emerald-500" />
              Curved
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

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
        <DropdownMenuItem onClick={() => onInsert('evaluation')} disabled={disableInteractive}>
          <IconCircle className="bg-indigo-500/10 mr-2">
            <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
          </IconCircle>
          Evaluation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('agentic-designer')} disabled={disableInteractive}>
          <IconCircle className="bg-cyan-500/10 mr-2">
            <Workflow className="h-3.5 w-3.5 text-cyan-500" />
          </IconCircle>
          Agentic Designer
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
        <DropdownMenuItem onClick={() => onInsert('thoughts-results')}>
          <IconCircle className="bg-blue-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
          </IconCircle>
          Thoughts Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('rating-results')}>
          <IconCircle className="bg-orange-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
          </IconCircle>
          Rating Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('evaluation-results')}>
          <IconCircle className="bg-indigo-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
          </IconCircle>
          Evaluation Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onInsert('agentic-designer-results')}>
          <IconCircle className="bg-cyan-400/10 mr-2">
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
          </IconCircle>
          Agentic Designer Results
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
