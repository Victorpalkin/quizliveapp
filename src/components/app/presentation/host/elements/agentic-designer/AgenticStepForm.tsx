'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { AgenticDesignerFieldConfig } from '@/lib/types';

interface AgenticStepFormProps {
  fields: AgenticDesignerFieldConfig[];
  values: Record<string, string | boolean>;
  onChange: (id: string, value: string | boolean) => void;
  disabled?: boolean;
}

export function AgenticStepForm({ fields, values, onChange, disabled }: AgenticStepFormProps) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.id}>
          {field.type === 'checkbox' ? (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{field.label}</Label>
                <Switch
                  checked={!!values[field.id]}
                  onCheckedChange={(checked) => onChange(field.id, checked)}
                  disabled={disabled}
                />
              </div>
              {field.helpText && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{field.helpText}</p>
              )}
            </>
          ) : field.type === 'textarea' ? (
            <>
              <Label className="text-xs">{field.label}</Label>
              {field.helpText && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{field.helpText}</p>
              )}
              <Textarea
                value={(values[field.id] as string) || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={2}
                className="mt-1 text-xs"
                disabled={disabled}
              />
            </>
          ) : (
            <>
              <Label className="text-xs">{field.label}</Label>
              {field.helpText && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{field.helpText}</p>
              )}
              <Input
                value={(values[field.id] as string) || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1 text-xs"
                disabled={disabled}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
