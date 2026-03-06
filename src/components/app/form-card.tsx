import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FormCardProps {
  title: string;
  description?: string;
  headerExtra?: React.ReactNode;
  contentClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormCard({
  title,
  description,
  headerExtra,
  contentClassName = 'space-y-4',
  className,
  children,
}: FormCardProps) {
  return (
    <Card className={cn('shadow-lg rounded-2xl border border-card-border', className)}>
      <CardHeader>
        {headerExtra ? (
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {headerExtra}
          </div>
        ) : (
          <>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
