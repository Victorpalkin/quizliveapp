import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function ReconnectingScreen() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold">Reconnecting...</h1>
      <p className="text-muted-foreground mt-2 text-xl">Restoring your session</p>
      <LoadingSpinner message="Please wait while we reconnect you to the game..." className="mt-12" />
    </div>
  );
}
