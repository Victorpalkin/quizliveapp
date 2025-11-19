import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Users } from 'lucide-react';

interface LobbyScreenProps {
  playerName: string;
  gamePin: string;
}

export function LobbyScreen({ playerName, gamePin }: LobbyScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <Card className="max-w-2xl w-full shadow-xl border border-card-border">
        <div className="p-12 space-y-8 text-center">
          {/* Icon Badge */}
          <div className="flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-6">
              <Users className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold">You're in, {playerName}!</h1>
            <p className="text-muted-foreground text-xl">Get ready to play...</p>
          </div>

          {/* Game PIN Display */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-card-border">
            <p className="text-sm text-muted-foreground mb-2">Game PIN</p>
            <p className="text-4xl font-mono font-semibold tracking-widest bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {gamePin}
            </p>
          </div>
        </div>
      </Card>

      {/* Loading indicator */}
      <div className="mt-12">
        <LoadingSpinner message="Waiting for the host to start the game..." />
      </div>
    </div>
  );
}
