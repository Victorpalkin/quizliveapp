'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Sparkles, FileText, Cloud, ChevronDown, BarChart3, LayoutGrid, Presentation } from 'lucide-react';

export function CreateDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Browse All - Links to the new create landing page */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/create" className="flex items-center py-2">
            <LayoutGrid className="mr-2 h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">Browse All Activities</span>
              <span className="text-xs text-muted-foreground">Compare options & learn more</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Quick Create Options */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/quiz/create" className="flex items-center">
            <FileText className="mr-2 h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span>Quiz</span>
              <span className="text-xs text-muted-foreground">Trivia with scoring</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/quiz/create-ai" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span>Quiz with AI</span>
              <span className="text-xs text-muted-foreground">AI-generated questions</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/thoughts-gathering/create" className="flex items-center">
            <Cloud className="mr-2 h-4 w-4 text-blue-500" />
            <div className="flex flex-col">
              <span>Thoughts Gathering</span>
              <span className="text-xs text-muted-foreground">Collect & visualize topics</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/evaluation/create" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-orange-500" />
            <div className="flex flex-col">
              <span>Evaluation</span>
              <span className="text-xs text-muted-foreground">Prioritize with metrics</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/presentation/create" className="flex items-center">
            <Presentation className="mr-2 h-4 w-4 text-indigo-500" />
            <div className="flex flex-col">
              <span>Presentation</span>
              <span className="text-xs text-muted-foreground">Interactive slides</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/presentation/create-ai" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
            <div className="flex flex-col">
              <span>Presentation with AI</span>
              <span className="text-xs text-muted-foreground">AI-generated slides</span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
