import { cn } from '@/lib/utils';

interface GridBackplateProps {
  pattern?: 'dots' | 'grid' | 'waves';
  className?: string;
  opacity?: number;
}

export function GridBackplate({ 
  pattern = 'dots', 
  className, 
  opacity = 0.5 
}: GridBackplateProps) {
  const patternUrl = `/svg/bg-${pattern}.svg`;
  
  return (
    <div 
      className={cn('absolute inset-0 -z-10', className)}
      style={{
        backgroundImage: `url('${patternUrl}')`,
        backgroundRepeat: 'repeat',
        opacity
      }}
    />
  );
}
