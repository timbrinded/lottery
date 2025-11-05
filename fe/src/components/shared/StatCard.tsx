import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  kicker: string;
  value: string | number;
  label?: string;
  icon?: LucideIcon;
  className?: string;
  artworkSrc?: string;
  artworkAlt?: string;
}

export function StatCard({ 
  kicker, 
  value, 
  label, 
  icon: Icon, 
  className,
  artworkSrc,
  artworkAlt,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden shadow-mintSoft', className)}>
      <CardContent
        className="relative p-6"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(42, 203, 170, 0.12), rgba(25, 92, 255, 0.08)), url('/svg/bg-dots.svg')",
          backgroundRepeat: 'no-repeat, repeat',
          backgroundSize: '300%, 220px',
          backgroundPosition: 'center, left top',
          backgroundBlendMode: 'screen',
        }}
      >
        {artworkSrc && (
          <img
            src={artworkSrc}
            alt={artworkAlt ?? ''}
            aria-hidden={artworkAlt ? undefined : true}
            className="pointer-events-none absolute -right-4 -top-6 hidden h-20 w-auto opacity-60 sm:block"
          />
        )}
        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {kicker}
            </p>
            <p className="text-4xl font-bold text-foreground">
              {value}
            </p>
            {label && (
              <p className="text-sm text-muted-foreground">
                {label}
              </p>
            )}
          </div>
          {Icon && (
            <Icon className="h-8 w-8 text-primary/40" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
