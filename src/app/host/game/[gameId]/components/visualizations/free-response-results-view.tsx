import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FreeResponseResultsViewProps {
  correctAnswer: string;
  alternativeAnswers?: string[];
  totalAnswered: number;
}

export function FreeResponseResultsView({
  correctAnswer,
  alternativeAnswers,
  totalAnswered
}: FreeResponseResultsViewProps) {
  return (
    <Card className="w-full max-w-2xl flex-1">
      <CardHeader>
        <CardTitle>Correct Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-primary/10 rounded-lg border-2 border-primary text-center">
          <p className="text-3xl font-bold text-primary mb-2">
            {correctAnswer}
          </p>
          {alternativeAnswers && alternativeAnswers.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Also accepted: {alternativeAnswers.join(', ')}
            </p>
          )}
          <p className="text-lg mt-4 text-muted-foreground">
            {totalAnswered} player{totalAnswered !== 1 ? 's' : ''} answered
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
