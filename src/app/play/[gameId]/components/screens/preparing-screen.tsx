import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PreparingScreen() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
      <h1 className="text-4xl font-bold">Get Ready...</h1>
      <p className="text-muted-foreground mt-2 text-xl">The next question is about to start!</p>
      <LoadingSpinner className="mt-8" />
    </div>
  );
}
