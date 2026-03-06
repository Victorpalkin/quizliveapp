import React from 'react';
import {
  BarChart3,
  Target,
  Scale,
  Vote,
} from 'lucide-react';
import type { EvaluationMetric } from '@/lib/types';

export interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  metrics: Omit<EvaluationMetric, 'id'>[];
}

export const EVALUATION_TEMPLATES: EvaluationTemplate[] = [
  {
    id: 'impact-effort',
    name: 'Impact/Effort Matrix',
    description: 'Prioritize by impact vs. effort - great for project planning',
    icon: <Target className="h-5 w-5 text-green-500" />,
    metrics: [
      { name: 'Impact', description: 'How much value will this deliver?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
      { name: 'Effort', description: 'How much work is required?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: true },
    ],
  },
  {
    id: 'priority',
    name: 'Simple Priority',
    description: 'Single metric ranking by importance',
    icon: <BarChart3 className="h-5 w-5 text-orange-500" />,
    metrics: [
      { name: 'Priority', description: 'How important is this?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'feasibility',
    name: 'Importance + Feasibility',
    description: 'Balance desirability with practicality',
    icon: <Scale className="h-5 w-5 text-blue-500" />,
    metrics: [
      { name: 'Importance', description: 'How important is this to achieve?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1.5, lowerIsBetter: false },
      { name: 'Feasibility', description: 'How realistic is it to accomplish?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'voting',
    name: 'Dot Voting',
    description: 'Simple yes/no voting for quick decisions',
    icon: <Vote className="h-5 w-5 text-purple-500" />,
    metrics: [
      { name: 'Vote', description: 'Do you support this?', scaleType: 'labels', scaleMin: 1, scaleMax: 2, scaleLabels: ['No', 'Yes'], weight: 1, lowerIsBetter: false },
    ],
  },
];
