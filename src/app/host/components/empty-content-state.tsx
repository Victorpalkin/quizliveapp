'use client';

import { FileText, Cloud } from 'lucide-react';

export function EmptyContentState() {
  return (
    <div className="col-span-full text-center text-muted-foreground py-16">
      <div className="flex justify-center gap-4 mb-6">
        <FileText className="h-12 w-12 opacity-30" />
        <Cloud className="h-12 w-12 opacity-30" />
      </div>
      <p className="mb-2 text-lg">You haven&apos;t created any content yet.</p>
      <p className="text-sm">Use the Create button above to get started with a quiz or interest cloud!</p>
    </div>
  );
}
