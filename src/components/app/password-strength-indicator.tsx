'use client';

import { calculatePasswordStrength, type PasswordStrength } from '@/lib/validation';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }

  const strength = calculatePasswordStrength(password);

  // Calculate progress percentage (0-100)
  const progressValue = (strength.score / 4) * 100;

  // Determine color based on score
  const getColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score === 2) return 'bg-yellow-500';
    if (score === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getTextColor = (score: number) => {
    if (score <= 1) return 'text-red-600';
    if (score === 2) return 'text-yellow-600';
    if (score === 3) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength</span>
        <span className={cn('text-sm font-medium', getTextColor(strength.score))}>
          {strength.feedback}
        </span>
      </div>

      <Progress
        value={progressValue}
        className="h-2"
        indicatorClassName={getColor(strength.score)}
      />

      <div className="space-y-1 text-xs text-muted-foreground">
        <RequirementItem met={strength.hasMinLength} text="At least 8 characters" />
        <RequirementItem met={strength.hasUppercase} text="Uppercase letter" />
        <RequirementItem met={strength.hasLowercase} text="Lowercase letter" />
        <RequirementItem met={strength.hasNumber} text="Number" />
        <RequirementItem met={strength.hasSpecialChar} text="Special character" />
      </div>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={cn(met && 'text-green-600')}>{text}</span>
    </div>
  );
}
