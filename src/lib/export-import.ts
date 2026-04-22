import type { ActivityType } from './types';

export interface ExportEnvelope {
  version: 1;
  type: ActivityType;
  exportedAt: string;
  title: string;
  content: Record<string, unknown>;
}

const STRIPPED_FIELDS = ['id', 'hostId', 'createdAt', 'updatedAt'];

function stripFields(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (STRIPPED_FIELDS.includes(key)) continue;
    result[key] = value;
  }
  return result;
}

export function exportActivity(
  type: ActivityType,
  title: string,
  data: Record<string, unknown>
): void {
  const envelope: ExportEnvelope = {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    title,
    content: stripFields(data),
  };

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${sanitizedTitle}-${type}-${date}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const VALID_TYPES: ActivityType[] = [
  'quiz',
  'poll',
  'thoughts-gathering',
  'evaluation',
  'presentation',
];

export function validateImport(raw: unknown): {
  valid: true;
  envelope: ExportEnvelope;
} | {
  valid: false;
  error: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid file: not a JSON object' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version !== 1) {
    return { valid: false, error: `Unsupported version: ${obj.version}` };
  }

  if (!VALID_TYPES.includes(obj.type as ActivityType)) {
    return { valid: false, error: `Unknown activity type: ${obj.type}` };
  }

  if (!obj.content || typeof obj.content !== 'object') {
    return { valid: false, error: 'Missing or invalid content field' };
  }

  const type = obj.type as ActivityType;
  const content = obj.content as Record<string, unknown>;

  switch (type) {
    case 'quiz':
      if (!Array.isArray(content.questions)) {
        return { valid: false, error: 'Quiz must have a questions array' };
      }
      if (!content.title || typeof content.title !== 'string') {
        return { valid: false, error: 'Quiz must have a title' };
      }
      break;
    case 'poll':
      if (!Array.isArray(content.questions)) {
        return { valid: false, error: 'Poll must have a questions array' };
      }
      break;
    case 'thoughts-gathering':
      if (!content.config || typeof content.config !== 'object') {
        return { valid: false, error: 'Thoughts gathering must have a config' };
      }
      break;
    case 'evaluation':
      if (!content.config || typeof content.config !== 'object') {
        return { valid: false, error: 'Evaluation must have a config' };
      }
      break;
    case 'presentation':
      if (!Array.isArray(content.slides)) {
        return { valid: false, error: 'Presentation must have a slides array' };
      }
      break;
  }

  return { valid: true, envelope: obj as unknown as ExportEnvelope };
}

export function getImportSummary(envelope: ExportEnvelope): string {
  const content = envelope.content;
  switch (envelope.type) {
    case 'quiz': {
      const questions = content.questions as unknown[];
      return `${questions.length} question${questions.length !== 1 ? 's' : ''}`;
    }
    case 'poll': {
      const questions = content.questions as unknown[];
      return `${questions.length} question${questions.length !== 1 ? 's' : ''}`;
    }
    case 'presentation': {
      const slides = content.slides as unknown[];
      return `${slides.length} slide${slides.length !== 1 ? 's' : ''}`;
    }
    case 'thoughts-gathering':
      return 'Thoughts gathering activity';
    case 'evaluation': {
      const config = content.config as Record<string, unknown>;
      const metrics = config.metrics as unknown[] | undefined;
      return metrics ? `${metrics.length} metric${metrics.length !== 1 ? 's' : ''}` : 'Evaluation activity';
    }
    default:
      return '';
  }
}

export function getCollectionForType(type: ActivityType): string {
  switch (type) {
    case 'quiz':
      return 'quizzes';
    case 'presentation':
      return 'presentations';
    default:
      return 'activities';
  }
}
