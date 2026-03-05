'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Heart, HelpCircle } from 'lucide-react';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface OverviewTabProps {
  analytics: PresentationAnalytics;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

const ACCENT_BORDERS = ['border-l-blue-500', 'border-l-green-500', 'border-l-red-500', 'border-l-purple-500'];

export function OverviewTab({ analytics }: OverviewTabProps) {
  const stats = [
    { label: 'Players', value: analytics.totalPlayers, icon: Users, color: 'text-blue-500' },
    { label: 'Responses', value: analytics.totalResponses, icon: MessageSquare, color: 'text-green-500' },
    { label: 'Reactions', value: analytics.totalReactions, icon: Heart, color: 'text-red-500' },
    { label: 'Questions', value: analytics.totalQuestions, icon: HelpCircle, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className={`border-l-4 ${ACCENT_BORDERS[i]} glass`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold">
                  <AnimatedNumber value={stat.value} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              <AnimatedNumber value={Math.round(analytics.averageScore)} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">points per player</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
