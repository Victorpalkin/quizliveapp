'use client';

import Link from 'next/link';
import { FileQuestion, Cloud, BarChart3, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmptyContentStateProps {
  userName?: string;
}

const activityTypes = [
  {
    type: 'quiz',
    title: 'Quiz',
    description: 'Test knowledge with competitive scoring and live leaderboards',
    icon: FileQuestion,
    href: '/host/quiz/create',
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
  },
  {
    type: 'interest-cloud',
    title: 'Interest Cloud',
    description: 'Collect topics from your audience and display as a word cloud',
    icon: Cloud,
    href: '/host/interest-cloud/create',
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
  },
  {
    type: 'ranking',
    title: 'Ranking',
    description: 'Have participants rate and prioritize items with custom metrics',
    icon: BarChart3,
    href: '/host/ranking/create',
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
  },
];

export function EmptyContentState({ userName }: EmptyContentStateProps) {
  const displayName = userName?.split(' ')[0] || 'there';

  return (
    <div className="col-span-full">
      {/* Welcome Message */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">
          Welcome{displayName !== 'there' ? `, ${displayName}` : ''}!
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Let&apos;s create your first interactive activity to engage your audience
        </p>
      </div>

      {/* Activity Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {activityTypes.map(({ type, title, description, icon: Icon, href, gradient, iconColor }) => (
          <Card
            key={type}
            className="group hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
          >
            <CardHeader className="pb-2">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-2`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90`}>
                <Link href={href}>
                  Create {title}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Browse All Link */}
      <div className="text-center mt-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/host/create">
            Browse all activity types
          </Link>
        </Button>
      </div>
    </div>
  );
}
