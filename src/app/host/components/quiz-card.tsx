'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Eye, Edit, Share2, FileQuestion } from 'lucide-react';
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
import type { Quiz } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface QuizCardProps {
  quiz: Quiz;
  onHost: (quizId: string) => void;
  onPreview: (quiz: Quiz) => void;
  onShare: (quiz: { id: string; title: string }) => void;
  onDelete: (quizId: string) => void;
}

export function QuizCard({ quiz, onHost, onPreview, onShare, onDelete }: QuizCardProps) {
  const dateDisplay = formatRelativeTime(quiz.updatedAt || quiz.createdAt);

  return (
    <Card variant="interactive" className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-3">
        <div className='flex-grow'>
          <div className="flex items-center gap-2 mb-1">
            <FileQuestion className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-lg font-semibold">{quiz.title}</CardTitle>
          </div>
          <CardDescription className="text-sm">
            {quiz.questions.length} questions
            {dateDisplay && <span className="text-muted-foreground"> · {dateDisplay}</span>}
          </CardDescription>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare({ id: quiz.id, title: quiz.title })}
            title="Share quiz"
            className="h-8 w-8 hover:bg-muted rounded-lg"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button asChild variant="ghost" size="icon" title="Edit quiz" className="h-8 w-8 hover:bg-muted rounded-lg">
            <Link href={`/host/quiz/${quiz.id}`}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete quiz" className="h-8 w-8 hover:bg-muted rounded-lg">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Are you sure you want to delete this quiz?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This action cannot be undone. This will permanently delete the quiz &apos;{quiz.title}&apos; and all its images.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(quiz.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
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
          className="w-full"
          onClick={() => onHost(quiz.id)}
        >
          <Gamepad2 className="mr-2 h-4 w-4" /> Host Game
        </Button>
        <Button className="w-full" variant="outline" onClick={() => onPreview(quiz)}>
          <Eye className="mr-2 h-4 w-4" /> Preview Quiz
        </Button>
      </CardContent>
    </Card>
  );
}
