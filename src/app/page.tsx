import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/app/theme-toggle';
import {
  Zap,
  Play,
  Sparkles,
  BrainCircuit,
  Cloud,
  BarChart3,
  Users,
  Timer,
  ArrowRight,
  Smartphone,
  LineChart,
  MessageSquare,
  Presentation,
  ListChecks,
} from 'lucide-react';
import { HostReconnectOverlay } from '@/components/app/host-reconnect-banner';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Host Reconnection Overlay */}
      <HostReconnectOverlay />

      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-1.5">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Zivo
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto px-6 py-16 md:py-20 text-center relative">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Real-time Audience Engagement
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Run{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Live Interactive Sessions
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Host real-time quizzes, gather thoughts from your audience, and run collaborative
                evaluation sessions — all synchronized across every device.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Link href="/host">
                    <Zap className="mr-2 h-4 w-4" />
                    Host Activities
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 hover:bg-accent/10 transition-colors"
                >
                  <Link href="/join">
                    <Play className="mr-2 h-4 w-4" />
                    Join Session
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Types Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Choose Your Activity Type
              </h2>
              <p className="text-muted-foreground">
                The right format for your live session
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Presentation */}
              <Card className="border-card-border hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-purple-500/10 p-3 w-fit mb-4">
                    <Presentation className="h-8 w-8 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Presentation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Combine slides with interactive activities. Import from Google Slides or generate with AI.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Keynotes, training sessions, workshops, interactive lectures
                  </p>
                </CardContent>
              </Card>

              {/* Quiz */}
              <Card className="border-card-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-primary/10 p-3 w-fit mb-4">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Quiz</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scored questions with leaderboards. Create manually or generate with AI.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Knowledge checks, competitions, gamified learning
                  </p>
                </CardContent>
              </Card>

              {/* Poll */}
              <Card className="border-card-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-green-500/10 p-3 w-fit mb-4">
                    <ListChecks className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Poll</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unscored questions to gather opinions. See real-time response distributions.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quick votes, feedback collection, audience sentiment
                  </p>
                </CardContent>
              </Card>

              {/* Thoughts Gathering */}
              <Card className="border-card-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-blue-500/10 p-3 w-fit mb-4">
                    <Cloud className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Thoughts Gathering</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Collect free-form ideas. AI groups similar responses into themes.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Brainstorming, Q&A, retrospectives, idea generation
                  </p>
                </CardContent>
              </Card>

              {/* Evaluation */}
              <Card className="border-card-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-orange-500/10 p-3 w-fit mb-4">
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Evaluation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Rate items on custom metrics. Visualize rankings with heatmaps and charts.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prioritization, comparisons, weighted scoring, assessments
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Key Features
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <Timer className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Real-time Sync</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">AI Content Generation</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <Presentation className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Google Slides Import</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Multiple Question Types</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <LineChart className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Instant Analytics</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <Users className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Easy PIN Joining</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <Smartphone className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Works Everywhere</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border">
                <BrainCircuit className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">AI Theme Clustering</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                How It Works
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 max-w-3xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-1">Create Activity</h3>
                <p className="text-sm text-muted-foreground">
                  Presentation, quiz, poll, or more
                </p>
              </div>

              <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground/50 flex-shrink-0" />

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-1">Share the PIN</h3>
                <p className="text-sm text-muted-foreground">
                  Participants join with a code
                </p>
              </div>

              <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground/50 flex-shrink-0" />

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-1">Run & Analyze</h3>
                <p className="text-sm text-muted-foreground">
                  Get real-time results
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-1.5">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold">Zivo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time interactive sessions for teams and audiences
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
