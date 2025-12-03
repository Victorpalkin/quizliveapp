'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Sparkles, FileText, Cloud, ChevronDown, BarChart3 } from 'lucide-react';

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/quiz/create" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Create Quiz
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/quiz/create-ai" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4" />
            Create Quiz with AI
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/interest-cloud/create" className="flex items-center">
            <Cloud className="mr-2 h-4 w-4" />
            Create Interest Cloud
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/host/ranking/create" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Create Ranking
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
