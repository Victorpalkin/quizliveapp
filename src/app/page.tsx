
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { BrainCircuit, Play } from 'lucide-react';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mb-8 flex items-center gap-4 text-primary">
          <BrainCircuit className="h-16 w-16" />
          <h1 className="text-7xl font-bold tracking-tighter text-foreground">
            QuizLive
          </h1>
        </div>
        <p className="max-w-2xl text-xl text-muted-foreground">
          The most electrifying way to host live quizzes. Create, launch, and play in seconds.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <Card className="transform transition-transform hover:scale-105 hover:shadow-2xl">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <BrainCircuit className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold">Become a Host</h2>
                <p className="text-muted-foreground">
                  Craft your own quiz and challenge your friends, students, or colleagues.
                </p>
                <Button asChild size="lg" className="mt-4 w-full bg-primary hover:bg-primary/90">
                  <Link href="/host">
                    Manage games
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="transform transition-transform hover:scale-105 hover:shadow-2xl">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-accent/10 p-4 text-accent">
                  <Play className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold">Join the Fun</h2>
                <p className="text-muted-foreground">
                  Got a game PIN? Jump right into the action and show off your knowledge.
                </p>
                <Button asChild size="lg" className="mt-4 w-full bg-accent hover:bg-accent/90">
                  <Link href="/join">
                    Join a Game
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
