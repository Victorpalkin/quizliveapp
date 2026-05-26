import Link from 'next/link';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZivoLogoProps {
  href?: string;
  className?: string;
}

export function ZivoLogo({ href = '/host', className }: ZivoLogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-bold text-lg", className)}>
      <Zap className="h-6 w-6 text-primary" />
      <span className="text-foreground">Zivo</span>
    </Link>
  );
}
