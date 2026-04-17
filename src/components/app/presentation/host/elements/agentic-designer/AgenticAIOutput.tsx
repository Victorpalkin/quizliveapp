'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';

interface AgenticAIOutputProps {
  output: string | null;
  isProcessing: boolean;
  stepTitle: string;
}

export function AgenticAIOutput({ output, isProcessing, stepTitle }: AgenticAIOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stepTitle.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Generating analysis...</p>
        <p className="text-xs">This may take up to a minute</p>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Click &ldquo;Run AI&rdquo; to generate analysis</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-1 pb-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-xs">
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
      </div>
    </div>
  );
}
