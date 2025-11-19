import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LobbyScreenProps {
  playerName: string;
  gamePin: string;
}

export function LobbyScreen({ playerName, gamePin }: LobbyScreenProps) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold">You're in, {playerName}!</h1>
      <p className="text-muted-foreground mt-2 text-xl">Get ready to play...</p>
      <p className="mt-8 text-2xl font-bold">Game PIN: {gamePin}</p>
      <LoadingSpinner message="Waiting for the host to start the game..." className="mt-12" />
    </div>
  );
}
