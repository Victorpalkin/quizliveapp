import { Timestamp } from 'firebase/firestore';

// ==========================================
// Agentic Enterprise Designer Types
// ==========================================

/** Static config stored on the SlideElement */
export interface AgenticDesignerConfig {
  target: string;
  description?: string;
  enablePlayerNudges?: boolean; // default: true
}

/** Runtime session stored at /games/{gameId}/agenticSessions/{elementId} */
export interface AgenticDesignerSession {
  elementId: string;
  currentStep: number; // 1-11
  stepsData: Record<number, Record<string, string | boolean>>;
  aiOutputs: Record<number, string>;
  completedSteps: number[];
  isProcessing: boolean;
  nudgesOpen: boolean;
  structuredOutputs: Record<number, AgenticDesignerStructuredOutput>;
  lastUpdated: number;
}

/** Structured items extracted from AI outputs (for evaluation integration) */
export interface AgenticDesignerStructuredOutput {
  items: { id: string; name: string; description: string }[];
}

/** Player nudge stored at /games/{gameId}/agenticSessions/{elementId}/nudges/{nudgeId} */
export interface AgenticDesignerNudge {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  step: number;
  submittedAt: Timestamp;
}

/** Reference from evaluation element to agentic designer structured output */
export interface AgenticSourceRef {
  elementId: string;
  slideId: string;
  step: number; // 3, 6, 7, or 8
}

/** Step field configuration */
export interface AgenticDesignerFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox';
  placeholder?: string;
  helpText?: string;
  parentField?: string;
}

/** Step configuration */
export interface AgenticDesignerStepConfig {
  id: number;
  title: string;
  shortDescription?: string;
  description: string;
  fields: AgenticDesignerFieldConfig[];
  aiPrompt: string;
  inputGuidance: string;
  outputExpectation: string;
  nudgeHints: string[];
  dependsOn: number[];
}

/** Steps that produce evaluatable items */
export const EXTRACTABLE_STEPS = [3, 6, 7, 8] as const;
