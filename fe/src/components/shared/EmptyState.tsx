import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  illustration?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  illustration,
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {illustration ? (
          <div className="mb-6">
            <img 
              src={illustration} 
              alt="" 
              className="h-32 w-32 object-contain opacity-80"
            />
          </div>
        ) : Icon ? (
          <div className="mb-4 rounded-full bg-muted p-4">
            <Icon className="size-8 text-muted-foreground" />
          </div>
        ) : null}
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="flex gap-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
