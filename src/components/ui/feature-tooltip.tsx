'use client';

import * as React from 'react';
import { HelpCircle, Info, Lightbulb } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type IconType = 'help' | 'info' | 'tip';

interface FeatureTooltipProps {
  /** The tooltip content - can be a string or React node */
  content: React.ReactNode;
  /** Optional icon type: 'help' (question mark), 'info' (i), or 'tip' (lightbulb) */
  icon?: IconType;
  /** Size of the icon in pixels */
  iconSize?: number;
  /** Additional className for the trigger icon */
  iconClassName?: string;
  /** Side where tooltip appears */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment of the tooltip */
  align?: 'start' | 'center' | 'end';
  /** Maximum width of the tooltip content */
  maxWidth?: number;
  /** If provided, renders children as the trigger instead of an icon */
  children?: React.ReactNode;
  /** Whether to show the tooltip inline with text */
  inline?: boolean;
}

const iconComponents: Record<IconType, React.ElementType> = {
  help: HelpCircle,
  info: Info,
  tip: Lightbulb,
};

/**
 * FeatureTooltip - An enhanced tooltip component for explaining features
 *
 * Usage:
 * ```tsx
 * // With icon trigger
 * <FeatureTooltip content="This feature allows you to..." icon="help" />
 *
 * // With custom trigger
 * <FeatureTooltip content="Click to learn more">
 *   <Button>Hover me</Button>
 * </FeatureTooltip>
 *
 * // Inline with text
 * <p>Configure your settings <FeatureTooltip content="..." inline /></p>
 * ```
 */
export function FeatureTooltip({
  content,
  icon = 'help',
  iconSize = 16,
  iconClassName,
  side = 'top',
  align = 'center',
  maxWidth = 280,
  children,
  inline = false,
}: FeatureTooltipProps) {
  const IconComponent = iconComponents[icon];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ? (
            <span className={cn(inline && 'inline-flex items-center')}>
              {children}
            </span>
          ) : (
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-full',
                'text-muted-foreground hover:text-foreground transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                inline ? 'ml-1 align-middle' : '',
                iconClassName
              )}
              aria-label="More information"
            >
              <IconComponent
                style={{ width: iconSize, height: iconSize }}
                className="flex-shrink-0"
              />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="text-sm"
          style={{ maxWidth }}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * FeatureTooltipRich - A tooltip with structured content (title, description, tip)
 */
interface FeatureTooltipRichProps extends Omit<FeatureTooltipProps, 'content'> {
  title: string;
  description: string;
  tip?: string;
}

export function FeatureTooltipRich({
  title,
  description,
  tip,
  ...props
}: FeatureTooltipRichProps) {
  return (
    <FeatureTooltip
      {...props}
      content={
        <div className="space-y-1.5">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground">{description}</p>
          {tip && (
            <p className="text-xs text-primary flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              {tip}
            </p>
          )}
        </div>
      }
    />
  );
}

/**
 * QuestionTypeTooltip - Pre-built tooltips for quiz question types
 */
const questionTypeDescriptions: Record<string, { title: string; description: string; tip: string }> = {
  'single-choice': {
    title: 'Single Choice',
    description: 'Players select one correct answer from multiple options. Points awarded for correct answers with time bonus.',
    tip: 'Best for factual questions with one clear answer.',
  },
  'multiple-choice': {
    title: 'Multiple Choice',
    description: 'Players select all correct answers. Partial credit for some correct answers, penalties for wrong selections.',
    tip: 'Great for "select all that apply" questions.',
  },
  'slider': {
    title: 'Slider / Estimate',
    description: 'Players guess a number within a range. Points based on how close they get to the correct value.',
    tip: 'Perfect for estimation questions like years, quantities, or percentages.',
  },
  'free-response': {
    title: 'Free Response',
    description: 'Players type their answer. Matches are checked against correct answer(s) with optional typo tolerance.',
    tip: 'Use for fill-in-the-blank or short answer questions.',
  },
  'slide': {
    title: 'Information Slide',
    description: 'A content slide with no question - just displays information to players. No scoring.',
    tip: 'Use to introduce topics or provide context between questions.',
  },
  'poll-single': {
    title: 'Poll (Single)',
    description: 'Collect opinions - no correct answer. Players pick one option and results show distribution.',
    tip: 'Great for gathering audience opinions or preferences.',
  },
  'poll-multiple': {
    title: 'Poll (Multiple)',
    description: 'Collect opinions where players can select multiple options. Shows aggregated responses.',
    tip: 'Use for "which of these apply to you?" type questions.',
  },
};

interface QuestionTypeTooltipProps {
  type: keyof typeof questionTypeDescriptions;
  iconSize?: number;
}

export function QuestionTypeTooltip({ type, iconSize = 14 }: QuestionTypeTooltipProps) {
  const info = questionTypeDescriptions[type];
  if (!info) return null;

  return (
    <FeatureTooltipRich
      title={info.title}
      description={info.description}
      tip={info.tip}
      icon="info"
      iconSize={iconSize}
      maxWidth={300}
    />
  );
}
