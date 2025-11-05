import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GridBackplate } from './GridBackplate'

type DashboardGridProps = {
  stats: ReactNode
  main: ReactNode
  className?: string
  ornamentPattern?: 'dots' | 'grid'
}

export function DashboardGrid({ stats, main, className, ornamentPattern = 'dots' }: DashboardGridProps) {
  return (
    <section className={cn('space-y-8', className)}>
      <div className="relative rounded-[32px] border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-mint-soft)]">
        <GridBackplate pattern={ornamentPattern} className="rounded-[32px] opacity-55" />
        {stats}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">{main}</div>
    </section>
  )
}
