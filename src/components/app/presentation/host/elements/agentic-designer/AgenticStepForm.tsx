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
      {fields.map((field) => {
        // Hide child fields when parent is not checked
        if (field.parentField && !values[field.parentField]) return null;

        const isChild = !!field.parentField;

        return (
          <div key={field.id} className={isChild ? 'ml-4 border-l-2 border-primary/20 pl-3' : ''}>
            {field.type === 'checkbox' ? (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{field.label}</Label>
                  <Switch
                    checked={!!values[field.id]}
                    onCheckedChange={(checked) => onChange(field.id, checked)}
                    disabled={disabled}
                  />
                </div>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground mt-0.5">{field.helpText}</p>
                )}
              </>
            ) : field.type === 'textarea' ? (
              <>
                <Label className="text-sm">{field.label}</Label>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground mt-0.5">{field.helpText}</p>
                )}
                <Textarea
                  value={(values[field.id] as string) || ''}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="mt-1 text-sm"
                  disabled={disabled}
                />
              </>
            ) : (
              <>
                <Label className="text-sm">{field.label}</Label>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground mt-0.5">{field.helpText}</p>
                )}
                <Input
                  value={(values[field.id] as string) || ''}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1 text-sm"
                  disabled={disabled}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
