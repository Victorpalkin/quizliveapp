import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import { cn } from '@/lib/utils';

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  tooltip?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  tooltip,
  icon,
  className,
}: SettingToggleProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-lg border p-4', className)}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <Label htmlFor={id}>{label}</Label>
          {tooltip && (
            <FeatureTooltip content={tooltip} icon="info" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
