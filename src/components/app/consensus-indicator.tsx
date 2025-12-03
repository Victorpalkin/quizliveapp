'use client';

import { cn } from '@/lib/utils';
import { Users, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { RankingItemResult } from '@/lib/types';

interface ConsensusIndicatorProps {
  level: 'high' | 'medium' | 'low';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const consensusConfig = {
  high: {
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    Icon: CheckCircle2,
    label: 'High Consensus',
    description: 'Strong agreement among participants',
  },
  medium: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    Icon: HelpCircle,
    label: 'Mixed Opinions',
    description: 'Some disagreement among participants',
  },
  low: {
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    Icon: AlertTriangle,
    label: 'Controversy',
    description: 'Significant disagreement among participants',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
  },
  md: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
  },
  lg: {
    icon: 'h-5 w-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
  },
};

export function ConsensusIndicator({
  level,
  showLabel = true,
  size = 'md',
  className,
}: ConsensusIndicatorProps) {
  const config = consensusConfig[level];
  const sizes = sizeConfig[size];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        config.bg,
        config.border,
        sizes.padding,
        className
      )}
    >
      <Icon className={cn(sizes.icon, config.color)} />
      {showLabel && (
        <span className={cn(sizes.text, config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </div>
  );
}

interface ConsensusListProps {
  items: RankingItemResult[];
  className?: string;
}

export function ConsensusList({ items, className }: ConsensusListProps) {
  const sortedItems = [...items].sort((a, b) => a.rank - b.rank);

  const highConsensus = sortedItems.filter(i => i.consensusLevel === 'high');
  const lowConsensus = sortedItems.filter(i => i.consensusLevel === 'low');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
          <div className="text-3xl font-bold text-green-500">
            {items.filter(i => i.consensusLevel === 'high').length}
          </div>
          <div className="text-sm text-muted-foreground">High Consensus</div>
        </div>
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
          <div className="text-3xl font-bold text-yellow-500">
            {items.filter(i => i.consensusLevel === 'medium').length}
          </div>
          <div className="text-sm text-muted-foreground">Mixed</div>
        </div>
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
          <div className="text-3xl font-bold text-red-500">
            {items.filter(i => i.consensusLevel === 'low').length}
          </div>
          <div className="text-sm text-muted-foreground">Controversial</div>
        </div>
      </div>

      {/* High Consensus Items */}
      {highConsensus.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium text-green-500 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            Strong Agreement
          </h4>
          <div className="space-y-1">
            {highConsensus.slice(0, 5).map(item => (
              <div
                key={item.itemId}
                className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-500/20"
              >
                <span className="font-medium">{item.itemText}</span>
                <span className="text-sm text-muted-foreground">
                  #{item.rank} • {Math.round(item.overallScore * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controversial Items */}
      {lowConsensus.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium text-red-500 mb-2">
            <AlertTriangle className="h-4 w-4" />
            Needs Discussion
          </h4>
          <div className="space-y-1">
            {lowConsensus.slice(0, 5).map(item => (
              <div
                key={item.itemId}
                className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-500/20"
              >
                <span className="font-medium">{item.itemText}</span>
                <span className="text-sm text-muted-foreground">
                  #{item.rank} • {Math.round(item.overallScore * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
