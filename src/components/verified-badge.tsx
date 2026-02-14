import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-sky-500 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400',
        className
      )}
    >
      <Check className="h-3 w-3" />
      Verified Teacher
    </div>
  );
}
