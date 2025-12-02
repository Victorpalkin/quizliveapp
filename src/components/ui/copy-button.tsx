'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <Copy className="h-5 w-5" />
      )}
    </Button>
  );
}
