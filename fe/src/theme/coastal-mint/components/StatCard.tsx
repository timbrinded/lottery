import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'mint-sheen flex flex-col justify-between gap-3 rounded-[24px] border border-border/60 bg-card px-6 py-6 shadow-[var(--shadow-mint-soft)] backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {icon ? <span className="text-primary">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="text-3xl font-semibold text-foreground md:text-4xl">{value}</div>
      {hint ? <div className="text-sm text-muted-foreground/80">{hint}</div> : null}
    </div>
  )
}
