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
  CheckCircle,
  ArrowRight,
  Smartphone,
  LineChart,
  MessageSquare,
} from 'lucide-react';
import { HostReconnectOverlay } from '@/components/app/host-reconnect-banner';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Host Reconnection Overlay */}
      <HostReconnectOverlay />

      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-2">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Zivo
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto px-6 py-24 md:py-32 text-center relative">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Real-time Audience Engagement
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Run{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Live Interactive Sessions
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Host real-time quizzes, gather thoughts from your audience, and run collaborative
                evaluation sessions — all synchronized across every device.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Link href="/host">
                    <Zap className="mr-2 h-5 w-5" />
                    Host Activities
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-8 py-6 text-lg hover:bg-accent/10 transition-colors"
                >
                  <Link href="/join">
                    <Play className="mr-2 h-5 w-5" />
                    Join Session
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Three Activity Types
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the right format for your live session
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Thoughts Gathering */}
              <Card className="border-card-border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
                <CardContent className="p-8">
                  <div className="rounded-2xl bg-blue-500/10 p-4 w-fit mb-6 group-hover:bg-blue-500/20 transition-colors">
                    <Cloud className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Thoughts Gathering</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Collect ideas, feedback, and insights from your audience.
                    AI-powered clustering reveals themes and priorities.
                  </p>
                  <div className="space-y-3 text-sm">
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Use cases</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Brainstorming sessions</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Customer discovery & needs analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Q&A and feedback collection</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Pain point identification</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Workshop retrospectives</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quizzes & Polls */}
              <Card className="border-card-border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
                <CardContent className="p-8">
                  <div className="rounded-2xl bg-primary/10 p-4 w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                    <BrainCircuit className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Quizzes & Polls</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Engage your audience with interactive questions.
                    Real-time results keep energy high and capture opinions.
                  </p>
                  <div className="space-y-3 text-sm">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide">Use cases</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Live polling during presentations</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Knowledge checks & training</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Product demo engagement</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Quick voting on options</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Icebreakers & team building</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation */}
              <Card className="border-card-border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
                <CardContent className="p-8">
                  <div className="rounded-2xl bg-orange-500/10 p-4 w-fit mb-6 group-hover:bg-orange-500/20 transition-colors">
                    <BarChart3 className="h-10 w-10 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Evaluation</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Rate and rank items across custom criteria.
                    Weighted scoring and consensus analysis drive decisions.
                  </p>
                  <div className="space-y-3 text-sm">
                    <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Use cases</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>Feature prioritization workshops</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>Vendor or solution comparison</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>Requirements scoring (MoSCoW, RICE)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>Risk or impact assessment</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>Team decision-making</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features that make audience engagement effortless
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Timer className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Real-time Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Instant updates across all devices with millisecond precision
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate quizzes, extract topics, and evaluate submissions with AI
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple Question Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Quizzes, polls, sliders, free text, and information slides
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Instant Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed results with charts, heatmaps, and exportable data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Easy PIN Joining</h3>
                  <p className="text-sm text-muted-foreground">
                    Participants join instantly with a simple 8-character code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-card-border">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Works Everywhere</h3>
                  <p className="text-sm text-muted-foreground">
                    Responsive design works on phones, tablets, and desktops
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get started in minutes with three simple steps
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 max-w-4xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Activity</h3>
                <p className="text-muted-foreground">
                  Choose a quiz, thoughts gathering, or evaluation session
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="hidden md:block h-8 w-8 text-muted-foreground/50 flex-shrink-0" />

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Share the PIN</h3>
                <p className="text-muted-foreground">
                  Participants join instantly using the unique session code
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="hidden md:block h-8 w-8 text-muted-foreground/50 flex-shrink-0" />

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Engage & Insights</h3>
                <p className="text-muted-foreground">
                  Run your session and get real-time results and analytics
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border">
          <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-2">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold">Zivo</span>
            </div>
            <p className="text-muted-foreground">
              Real-time interactive sessions for teams and audiences
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
