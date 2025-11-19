import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SlideQuestion } from '@/lib/types';

interface SlideEditorProps {
  question: SlideQuestion;
  onUpdateQuestion: (updatedQuestion: SlideQuestion) => void;
}

export function SlideEditor({ question, onUpdateQuestion }: SlideEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <FormLabel>Slide Content</FormLabel>
        <p className="text-sm text-muted-foreground">
          Informational slide - no answer required. Use the Question Text field above as the slide title.
        </p>
      </div>
      <FormItem>
        <FormLabel>Description (Optional)</FormLabel>
        <FormControl>
          <Textarea
            value={question.description || ''}
            onChange={(e) => {
              onUpdateQuestion({ ...question, description: e.target.value });
            }}
            placeholder="Enter slide description or additional information"
            maxLength={1000}
            rows={4}
          />
        </FormControl>
      </FormItem>
    </div>
  );
}
