import { useState } from 'react';
import { FormControl, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';
import type { FreeResponseQuestion } from '@/lib/types';

interface FreeResponseEditorProps {
  question: FreeResponseQuestion;
  onUpdateQuestion: (updatedQuestion: FreeResponseQuestion) => void;
}

export function FreeResponseEditor({ question, onUpdateQuestion }: FreeResponseEditorProps) {
  const [newAlternative, setNewAlternative] = useState('');

  const addAlternativeAnswer = () => {
    if (!newAlternative.trim()) return;
    const alternatives = question.alternativeAnswers || [];
    onUpdateQuestion({
      ...question,
      alternativeAnswers: [...alternatives, newAlternative.trim()]
    });
    setNewAlternative('');
  };

  const removeAlternativeAnswer = (index: number) => {
    const alternatives = question.alternativeAnswers || [];
    onUpdateQuestion({
      ...question,
      alternativeAnswers: alternatives.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Correct Answer</FormLabel>
        <FormControl>
          <Input
            placeholder="Enter the correct answer"
            value={question.correctAnswer}
            onChange={(e) => {
              onUpdateQuestion({ ...question, correctAnswer: e.target.value });
            }}
            maxLength={200}
          />
        </FormControl>
        <FormDescription>
          The primary correct answer that players should type
        </FormDescription>
      </FormItem>

      <FormItem>
        <FormLabel>Alternative Answers (Optional)</FormLabel>
        <div className="space-y-2">
          {(question.alternativeAnswers || []).map((alt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={alt}
                onChange={(e) => {
                  const alternatives = [...(question.alternativeAnswers || [])];
                  alternatives[index] = e.target.value;
                  onUpdateQuestion({ ...question, alternativeAnswers: alternatives });
                }}
                maxLength={200}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAlternativeAnswer(index)}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add alternative answer..."
              value={newAlternative}
              onChange={(e) => setNewAlternative(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAlternativeAnswer();
                }
              }}
              maxLength={200}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addAlternativeAnswer}
              disabled={!newAlternative.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <FormDescription>
          Additional accepted answers (e.g., abbreviations, synonyms)
        </FormDescription>
      </FormItem>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <FormLabel>Allow Typos</FormLabel>
          <FormDescription>
            Accept answers with minor spelling mistakes
          </FormDescription>
        </div>
        <Switch
          checked={question.allowTypos !== false}
          onCheckedChange={(checked) => {
            onUpdateQuestion({ ...question, allowTypos: checked });
          }}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <FormLabel>Case Sensitive</FormLabel>
          <FormDescription>
            Require exact capitalization
          </FormDescription>
        </div>
        <Switch
          checked={question.caseSensitive === true}
          onCheckedChange={(checked) => {
            onUpdateQuestion({ ...question, caseSensitive: checked });
          }}
        />
      </div>
    </div>
  );
}
