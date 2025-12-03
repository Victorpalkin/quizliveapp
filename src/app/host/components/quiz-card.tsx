'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Eye, Edit, Share2 } from 'lucide-react';
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

interface QuizCardProps {
  quiz: Quiz;
  onHost: (quizId: string) => void;
  onPreview: (quiz: Quiz) => void;
  onShare: (quiz: { id: string; title: string }) => void;
  onDelete: (quizId: string) => void;
}

export function QuizCard({ quiz, onHost, onPreview, onShare, onDelete }: QuizCardProps) {
  return (
    <Card className="flex flex-col border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between p-6">
        <div className='flex-grow'>
          <CardTitle className="text-2xl font-semibold mb-2">{quiz.title}</CardTitle>
          <CardDescription className="text-base">{quiz.questions.length} questions</CardDescription>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare({ id: quiz.id, title: quiz.title })}
            title="Share quiz"
            className="hover:bg-muted rounded-lg"
          >
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button asChild variant="ghost" size="icon" title="Edit quiz" className="hover:bg-muted rounded-lg">
            <Link href={`/host/quiz/${quiz.id}`}>
              <Edit className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete quiz" className="hover:bg-muted rounded-lg">
                <Trash2 className="h-5 w-5 text-destructive" />
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
      <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
        <Button
          className="w-full px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold"
          onClick={() => onHost(quiz.id)}
        >
          <Gamepad2 className="mr-2 h-4 w-4" /> Host Game
        </Button>
        <Button className="w-full px-6 py-4 rounded-xl" variant="outline" onClick={() => onPreview(quiz)}>
          <Eye className="mr-2 h-4 w-4" /> Preview Quiz
        </Button>
      </CardContent>
    </Card>
  );
}
