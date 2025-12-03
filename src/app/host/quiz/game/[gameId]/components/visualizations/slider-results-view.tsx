import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SliderResultsViewProps {
  correctValue: number;
  minValue: number;
  maxValue: number;
  unit?: string;
  totalAnswered: number;
}

export function SliderResultsView({
  correctValue,
  minValue,
  maxValue,
  unit,
  totalAnswered
}: SliderResultsViewProps) {
  return (
    <Card className="w-full max-w-2xl flex-1">
      <CardHeader>
        <CardTitle>Correct Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-primary/10 rounded-lg border-2 border-primary text-center">
          <p className="text-5xl font-bold text-primary mb-2">
            {correctValue}{unit}
          </p>
          <p className="text-sm text-muted-foreground">
            Range: {minValue}{unit} - {maxValue}{unit}
          </p>
          <p className="text-lg mt-4 text-muted-foreground">
            {totalAnswered} player{totalAnswered !== 1 ? 's' : ''} answered
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
