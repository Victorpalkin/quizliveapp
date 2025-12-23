'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/app/header';
import {
  FileQuestion,
  Cloud,
  BarChart3,
  Sparkles,
  ArrowRight,
  Users,
  Trophy,
  Zap,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  Presentation,
} from 'lucide-react';
interface ActivityTypeCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  bestFor: string[];
  features: string[];
  href: string;
  aiOption?: { href: string; label: string };
}

function ActivityTypeCard({
  icon,
  iconBg,
  title,
  description,
  bestFor,
  features,
  href,
  aiOption,
}: ActivityTypeCardProps) {
  return (
    <Card
      className="group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-xl"
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div
            className={`p-3 rounded-xl ${iconBg} mb-3`}
          >
            {icon}
          </div>
          {aiOption && (
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Available
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best For */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Best for:</p>
          <div className="flex flex-wrap gap-2">
            {bestFor.map((item) => (
              <Badge key={item} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-2">
          <Button asChild className="w-full group-hover:bg-primary">
            <Link href={href}>
              Create {title}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          {aiOption && (
            <Button asChild variant="outline" className="w-full">
              <Link href={aiOption.href}>
                <Sparkles className="mr-2 h-4 w-4" />
                {aiOption.label}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreateActivityPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/host">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What would you like to create?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose an activity type to engage your audience. Each type offers unique ways to interact and gather insights.
          </p>
        </div>

        {/* Activity Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Quiz */}
          <ActivityTypeCard
            icon={<FileQuestion className="h-8 w-8 text-purple-600" />}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            title="Quiz"
            description="Competitive trivia with real-time scoring and leaderboards. Test knowledge and spark friendly competition."
            bestFor={['Training sessions', 'Classrooms', 'Team events', 'Icebreakers']}
            features={[
              'Multiple question types',
              'Time-based scoring',
              'Live leaderboard',
              'Detailed analytics',
            ]}
            href="/host/quiz/create"
            aiOption={{
              href: '/host/quiz/create-ai',
              label: 'Generate with AI',
            }}
          />

          {/* Thoughts Gathering */}
          <ActivityTypeCard
            icon={<Cloud className="h-8 w-8 text-blue-600" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            title="Thoughts Gathering"
            description="Collect topics and ideas from your audience, then visualize them as an interactive word cloud."
            bestFor={['Workshops', 'Brainstorming', 'Needs assessment', 'Team building']}
            features={[
              'Real-time word cloud',
              'Multiple submissions per person',
              'Anonymous or named',
              'Visual engagement',
            ]}
            href="/host/thoughts-gathering/create"
          />

          {/* Evaluation */}
          <ActivityTypeCard
            icon={<BarChart3 className="h-8 w-8 text-orange-600" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            title="Evaluation"
            description="Prioritize items with weighted metrics. Perfect for decision-making and gathering structured feedback."
            bestFor={['Feature prioritization', 'Retrospectives', 'Voting', 'Surveys']}
            features={[
              'Custom metrics (1-5)',
              'Weighted scoring',
              'Participant submissions',
              'Aggregated results',
            ]}
            href="/host/evaluation/create"
          />

          {/* Presentation */}
          <ActivityTypeCard
            icon={<Presentation className="h-8 w-8 text-indigo-600" />}
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            title="Presentation"
            description="Interactive slides with embedded quizzes, polls, and live feedback. Keep your audience engaged throughout."
            bestFor={['Conferences', 'Lectures', 'All-hands meetings', 'Webinars']}
            features={[
              'Mix content & activities',
              'Import from Google Slides',
              'Live participant responses',
              'Smooth transitions',
            ]}
            href="/host/presentation/create"
          />
        </div>

        {/* Help Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="p-4 rounded-full bg-primary/10">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-semibold mb-1">Not sure which to choose?</h3>
                <p className="text-muted-foreground mb-3">
                  Start with a <strong>Quiz</strong> if you want to test knowledge,
                  <strong> Thoughts Gathering</strong> for open-ended feedback,
                  or <strong>Evaluation</strong> for structured prioritization.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    <span>Quiz = Competition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>Thoughts = Discovery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span>Evaluation = Decisions</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
