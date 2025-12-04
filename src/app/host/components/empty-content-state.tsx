'use client';

import Link from 'next/link';
import { FileQuestion, Cloud, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const activityTypes = [
  {
    type: 'quiz',
    title: 'Quiz',
    description: 'Test knowledge with competitive scoring',
    icon: FileQuestion,
    href: '/host/quiz/create',
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
    aiOption: {
      href: '/host/quiz/create-ai',
      label: 'Create with AI',
    },
  },
  {
    type: 'interest-cloud',
    title: 'Interest Cloud',
    description: 'Collect topics as a word cloud',
    icon: Cloud,
    href: '/host/interest-cloud/create',
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
    aiOption: null,
  },
  {
    type: 'ranking',
    title: 'Ranking',
    description: 'Rate and prioritize items',
    icon: BarChart3,
    href: '/host/ranking/create',
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
    aiOption: null,
  },
];

export function EmptyContentState() {
  return (
    <div className="col-span-full">
      {/* Activity Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activityTypes.map(({ type, title, description, icon: Icon, href, gradient, iconColor, aiOption }) => (
          <Card
            key={type}
            variant="interactive"
            className="group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button asChild variant="gradient" className={`w-full bg-gradient-to-r ${gradient}`}>
                <Link href={href}>
                  Create {title}
                </Link>
              </Button>
              {aiOption && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={aiOption.href}>
                    <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                    {aiOption.label}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
