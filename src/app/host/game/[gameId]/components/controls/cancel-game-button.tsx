import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { deleteDoc, DocumentReference } from 'firebase/firestore';
import type { Game } from '@/lib/types';
import { handleFirestoreError } from '@/lib/utils/error-utils';
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

interface CancelGameButtonProps {
  gameRef: DocumentReference<Game> | null;
}

export function CancelGameButton({ gameRef }: CancelGameButtonProps) {
  const router = useRouter();

  const handleCancelGame = () => {
    if (!gameRef) return;
    deleteDoc(gameRef)
      .then(() => {
        router.push('/host');
      })
      .catch(error =>
        handleFirestoreError(error, {
          path: gameRef.path,
          operation: 'delete',
        }, "Error deleting game: ")
      );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Game
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the game for all players and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Yes, Cancel Game
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
