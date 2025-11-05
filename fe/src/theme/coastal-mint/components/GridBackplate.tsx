import { cn } from '@/lib/utils'

type GridBackplateProps = {
  pattern?: 'dots' | 'grid'
  className?: string
}

export function GridBackplate({ pattern = 'dots', className }: GridBackplateProps) {
  const base = 'absolute inset-0 -z-10 rounded-[32px]'
  const patternClass = pattern === 'grid' ? 'bg-mint-grid' : 'bg-mint-dots'

  return <div className={cn(base, patternClass, className)} aria-hidden="true" />
}
