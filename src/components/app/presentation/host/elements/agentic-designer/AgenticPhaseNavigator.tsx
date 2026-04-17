'use client';

import { useState } from 'react';
import { Check, Lock, LayoutList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AGENTIC_DESIGNER_STEPS, AGENTIC_PHASES } from '@/lib/agentic-designer-steps';

const TOTAL_STEPS = AGENTIC_DESIGNER_STEPS.length;

const PHASE_COLORS: Record<string, { active: string; bg: string; text: string; bar: string }> = {
  blue:    { active: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-600',   bar: 'bg-blue-500' },
  amber:   { active: 'border-amber-500',  bg: 'bg-amber-500/10',  text: 'text-amber-600',  bar: 'bg-amber-500' },
  violet:  { active: 'border-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-600', bar: 'bg-violet-500' },
  emerald: { active: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600', bar: 'bg-emerald-500' },
};

interface AgenticPhaseNavigatorProps {
  currentStep: number;
  completedSteps: number[];
  aiOutputs: Record<number, string>;
  onStepChange: (step: number) => void;
}

export function AgenticPhaseNavigator({
  currentStep,
  completedSteps,
  aiOutputs,
  onStepChange,
}: AgenticPhaseNavigatorProps) {
  const [overviewOpen, setOverviewOpen] = useState(false);

  const currentPhase = AGENTIC_PHASES.find((p) => p.steps.includes(currentStep));

  return (
    <div className="border-b bg-muted/30 flex-shrink-0">
      {/* Phase groups */}
      <div className="flex items-stretch px-2 py-2 overflow-x-auto gap-0">
        <TooltipProvider delayDuration={200}>
          {AGENTIC_PHASES.map((phase, phaseIdx) => {
            const colors = PHASE_COLORS[phase.color];
            const isActivePhase = phase.steps.includes(currentStep);
            const phaseCompleted = phase.steps.every((s) => completedSteps.includes(s));
            const phaseProgress = phase.steps.filter((s) => completedSteps.includes(s)).length;

            return (
              <div
                key={phase.label}
                className={`flex flex-col gap-1 px-2 ${
                  phaseIdx < AGENTIC_PHASES.length - 1 ? 'border-r border-border/50' : ''
                }`}
              >
                {/* Phase label */}
                <span
                  className={`text-sm uppercase tracking-wider font-semibold ${
                    isActivePhase ? colors.text : 'text-muted-foreground/60'
                  }`}
                >
                  {phase.label}
                  {phaseCompleted && <Check className="inline h-3.5 w-3.5 ml-1 text-green-500" />}
                </span>

                {/* Step buttons */}
                <div className="flex items-center gap-0.5">
                  {phase.steps.map((stepId) => {
                    const step = AGENTIC_DESIGNER_STEPS[stepId - 1];
                    const isActive = stepId === currentStep;
                    const isDone = completedSteps.includes(stepId);
                    const depsReady = step.dependsOn.every((d) => completedSteps.includes(d));

                    return (
                      <Tooltip key={stepId}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onStepChange(stepId)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : isDone
                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                : depsReady
                                ? 'text-muted-foreground hover:bg-muted'
                                : 'text-muted-foreground/40 cursor-not-allowed'
                            }`}
                            disabled={!depsReady && !isDone}
                          >
                            {isDone && !isActive ? (
                              <Check className="h-4 w-4" />
                            ) : !depsReady && !isDone ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : null}
                            <span>{stepId}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-sm">
                          {step.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TooltipProvider>

        {/* Overview button */}
        <div className="flex items-center ml-auto pl-2">
          <Popover open={overviewOpen} onOpenChange={setOverviewOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <LayoutList className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <div className="p-3 border-b">
                <h4 className="text-sm font-semibold">All Steps Overview</h4>
                <p className="text-sm text-muted-foreground">
                  {completedSteps.length} of {TOTAL_STEPS} completed
                </p>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                {AGENTIC_DESIGNER_STEPS.map((step) => {
                  const isDone = completedSteps.includes(step.id);
                  const output = aiOutputs[step.id];
                  const preview = output ? output.slice(0, 80).replace(/\n/g, ' ') + (output.length > 80 ? '...' : '') : null;

                  return (
                    <button
                      key={step.id}
                      onClick={() => { onStepChange(step.id); setOverviewOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors ${
                        step.id === currentStep ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">
                          {step.id}. {step.title}
                        </span>
                      </div>
                      {preview && (
                        <p className="text-sm text-muted-foreground mt-0.5 ml-6 truncate">
                          {preview}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div className="flex h-1">
        {AGENTIC_PHASES.map((phase) => {
          const colors = PHASE_COLORS[phase.color];
          const completed = phase.steps.filter((s) => completedSteps.includes(s)).length;
          const progress = (completed / phase.steps.length) * 100;

          return (
            <div key={phase.label} className="flex-1 bg-muted/50 relative">
              <div
                className={`absolute inset-y-0 left-0 ${colors.bar} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
