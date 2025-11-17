import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

interface DeleteGameButtonProps {
  gameRef: DocumentReference<Game> | null;
}

export function DeleteGameButton({ gameRef }: DeleteGameButtonProps) {
  const router = useRouter();

  const handleDeleteGame = () => {
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
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Game
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this game?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this game session. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
