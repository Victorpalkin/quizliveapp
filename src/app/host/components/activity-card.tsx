'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Cloud } from 'lucide-react';
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
import type { InterestCloudActivity } from '@/lib/types';

interface ActivityCardProps {
  activity: InterestCloudActivity;
  onDelete: (activityId: string) => void;
}

export function ActivityCard({ activity, onDelete }: ActivityCardProps) {
  return (
    <Card className="flex flex-col border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between p-6">
        <div className='flex-grow'>
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-2xl font-semibold">{activity.title}</CardTitle>
          </div>
          <CardDescription className="text-base">Interest Cloud</CardDescription>
        </div>
        <div className='flex items-center gap-1'>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete activity" className="hover:bg-muted rounded-lg">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Delete this activity?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This action cannot be undone. This will permanently delete &apos;{activity.title}&apos;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(activity.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
        <Button asChild className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold">
          <Link href={`/host/interest-cloud/${activity.id}`}>
            <Gamepad2 className="mr-2 h-4 w-4" /> Launch Session
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
