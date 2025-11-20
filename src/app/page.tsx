
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { BrainCircuit, Play, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        {/* Hero Section */}
        <div className="mb-12 space-y-6 max-w-3xl">
          {/* Logo and Title on same line */}
          <div className="flex items-center justify-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-4">
              <BrainCircuit className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-6xl md:text-7xl font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight py-2">
              gQuiz
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create engaging quizzes and play live with friends, students, or colleagues
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Simple, elegant, and fun</span>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Host Card */}
          <Card className="border-card-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
            <CardContent className="p-10">
              <div className="flex flex-col items-center gap-6">
                <div className="rounded-2xl bg-primary/10 p-6 group-hover:bg-primary/20 transition-colors">
                  <BrainCircuit className="h-12 w-12 text-primary" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold">Host a Quiz</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Create custom quizzes and host live game sessions with real-time scoring
                  </p>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="w-full mt-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Link href="/host">
                    Get Started
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Player Card */}
          <Card className="border-card-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
            <CardContent className="p-10">
              <div className="flex flex-col items-center gap-6">
                <div className="rounded-2xl bg-accent/10 p-6 group-hover:bg-accent/20 transition-colors">
                  <Play className="h-12 w-12 text-accent" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold">Join a Game</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Enter a game PIN and compete against others in real-time quiz battles
                  </p>
                </div>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full mt-2 hover:bg-accent/10 transition-colors"
                >
                  <Link href="/join">
                    Enter PIN
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subtle Footer */}
        <div className="mt-16 text-sm text-muted-foreground">
          <p>Powered by real-time technology</p>
        </div>
      </main>
    </div>
  );
}
