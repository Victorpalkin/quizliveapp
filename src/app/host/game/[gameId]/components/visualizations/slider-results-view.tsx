import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderResultsViewProps {
  responses: { name: string; value: number }[];
  correctValue: number;
  minValue: number;
  maxValue: number;
  unit?: string;
  acceptableError?: number;
}

export function SliderResultsView({
  responses,
  correctValue,
  minValue,
  maxValue,
  unit,
  acceptableError
}: SliderResultsViewProps) {
  return (
    <Card className="w-full max-w-2xl flex-1">
      <CardHeader>
        <CardTitle>Player Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
            <p className="text-sm text-muted-foreground mb-1">Correct Answer</p>
            <p className="text-3xl font-bold text-primary">
              {correctValue}{unit}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {minValue}{unit} - {maxValue}{unit}
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {responses.length === 0 ? (
              <p className="text-muted-foreground text-center p-4">No responses yet</p>
            ) : (
              responses.map((response, idx) => {
                const distance = Math.abs(response.value - correctValue);
                const range = maxValue - minValue;
                // Use configurable threshold (default: 5% of range) to match actual scoring logic
                const threshold = acceptableError ?? (range * 0.05);
                const isCorrect = distance <= threshold;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md",
                      isCorrect ? "bg-primary/10" : "bg-background/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{response.name}</span>
                      {isCorrect && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">
                        {response.value}{unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({distance > 0 ? `±${distance.toFixed(1)}` : 'exact'})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
