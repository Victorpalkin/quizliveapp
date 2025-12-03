import { Button } from '@/components/ui/button';

interface SessionInvalidScreenProps {
  onRejoin: () => void;
}

export function SessionInvalidScreen({ onRejoin }: SessionInvalidScreenProps) {
  return (
    <div className="text-center w-full max-w-sm">
      <h1 className="text-4xl font-bold text-destructive">Session Expired</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Your previous session could not be restored.
      </p>
      <p className="text-muted-foreground mt-2">
        Please join the game again with the PIN.
      </p>
      <Button
        onClick={onRejoin}
        size="lg"
        className="w-full mt-8"
      >
        Join Game
      </Button>
    </div>
  );
}
