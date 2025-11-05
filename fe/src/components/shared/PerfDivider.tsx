import { cn } from '@/lib/utils';

interface PerfDividerProps {
  className?: string;
}

export function PerfDivider({ className }: PerfDividerProps) {
  return <div className={cn('divider-perf', className)} />;
}
