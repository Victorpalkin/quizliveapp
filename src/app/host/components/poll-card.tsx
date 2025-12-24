'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Eye, Pencil, Vote } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PollActivity } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface PollCardProps {
  poll: PollActivity;
  onHost: (pollId: string) => void;
  onPreview: (poll: PollActivity) => void;
  onDelete: (pollId: string) => void;
}

export function PollCard({ poll, onHost, onPreview, onDelete }: PollCardProps) {
  const dateDisplay = formatRelativeTime(poll.updatedAt || poll.createdAt);
  const questionCount = poll.questions?.length || 0;

  return (
    <Card variant="interactive" className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-3">
        <div className='flex-grow'>
          <div className="flex items-center gap-2 mb-1">
            <Vote className="h-4 w-4 text-teal-500" />
            <CardTitle className="text-lg font-semibold">{poll.title}</CardTitle>
          </div>
          <CardDescription className="text-sm">
            {questionCount} {questionCount === 1 ? 'question' : 'questions'}
            {dateDisplay && <span className="text-muted-foreground"> · {dateDisplay}</span>}
          </CardDescription>
        </div>
        <div className='flex items-center gap-1'>
          <Button asChild variant="ghost" size="icon" title="Edit poll" className="h-8 w-8 hover:bg-muted rounded-lg">
            <Link href={`/host/poll/edit/${poll.id}`}>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete poll" className="h-8 w-8 hover:bg-muted rounded-lg">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Are you sure you want to delete this poll?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This action cannot be undone. This will permanently delete the poll &apos;{poll.title}&apos;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(poll.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end gap-2 p-4 pt-0">
        <Button
          variant="gradient"
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500"
          onClick={() => onHost(poll.id)}
        >
          <Gamepad2 className="mr-2 h-4 w-4" /> Launch Session
        </Button>
        <Button className="w-full" variant="outline" onClick={() => onPreview(poll)}>
          <Eye className="mr-2 h-4 w-4" /> Preview Poll
        </Button>
      </CardContent>
    </Card>
  );
}
