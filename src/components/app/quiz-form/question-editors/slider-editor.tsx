import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SliderQuestion } from '@/lib/types';

interface SliderEditorProps {
  question: SliderQuestion;
  onUpdateQuestion: (updatedQuestion: SliderQuestion) => void;
}

export function SliderEditor({ question, onUpdateQuestion }: SliderEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <FormItem>
          <FormLabel>Minimum Value</FormLabel>
          <FormControl>
            <Input
              type="number"
              value={question.minValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateQuestion({ ...question, minValue: val });
              }}
            />
          </FormControl>
        </FormItem>
        <FormItem>
          <FormLabel>Maximum Value</FormLabel>
          <FormControl>
            <Input
              type="number"
              value={question.maxValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateQuestion({ ...question, maxValue: val });
              }}
            />
          </FormControl>
        </FormItem>
        <FormItem>
          <FormLabel>Correct Value</FormLabel>
          <FormControl>
            <Input
              type="number"
              value={question.correctValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateQuestion({ ...question, correctValue: val });
              }}
            />
          </FormControl>
        </FormItem>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormItem>
          <FormLabel>Decimal Precision</FormLabel>
          <Select
            value={String(question.step || 1)}
            onValueChange={(value) => {
              const step = parseFloat(value);
              onUpdateQuestion({ ...question, step });
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="1">Whole numbers (1)</SelectItem>
              <SelectItem value="0.1">1 decimal (0.1)</SelectItem>
              <SelectItem value="0.01">2 decimals (0.01)</SelectItem>
              <SelectItem value="0.001">3 decimals (0.001)</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
        <FormItem>
          <FormLabel>Unit (Optional)</FormLabel>
          <FormControl>
            <Input
              placeholder="e.g., kg, %, °C"
              value={question.unit || ''}
              onChange={(e) => {
                onUpdateQuestion({ ...question, unit: e.target.value });
              }}
              maxLength={10}
            />
          </FormControl>
        </FormItem>
      </div>
      <FormItem>
        <FormLabel>Acceptable Error (±)</FormLabel>
        <FormControl>
          <Input
            type="number"
            placeholder={`Default: ${((question.maxValue - question.minValue) * 0.05).toFixed(2)}`}
            value={question.acceptableError ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
              onUpdateQuestion({ ...question, acceptableError: val });
            }}
          />
        </FormControl>
        <p className="text-sm text-muted-foreground mt-1">
          Answers within ±{question.acceptableError ?? ((question.maxValue - question.minValue) * 0.05).toFixed(2)} of {question.correctValue} will be marked correct
        </p>
      </FormItem>
    </div>
  );
}
