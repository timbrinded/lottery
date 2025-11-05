import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type HeroSplashProps = {
  title: string
  eyebrow?: string
  description: string
  primaryAction: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  illustration?: ReactNode
  className?: string
}

export function HeroSplash({
  title,
  eyebrow,
  description,
  primaryAction,
  secondaryAction,
  illustration,
  className,
}: HeroSplashProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[32px] bg-mint-hero px-8 py-16 shadow-[var(--shadow-mint-soft)]',
        'md:px-12 md:py-20 lg:px-16',
        className,
      )}
    >
      <div className="absolute inset-0 bg-mint-waves opacity-40 mix-blend-overlay" aria-hidden="true" />
      <div className="absolute -right-10 bottom-0 hidden h-40 w-40 rotate-6 opacity-60 lg:block">
        <img src="/svg/corner-stamp.svg" alt="" className="h-full w-full object-cover" />
      </div>

      <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="space-y-6 lg:max-w-[64ch]">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold tracking-wide text-primary">
              {eyebrow}
            </span>
          ) : null}

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="text-lg text-muted-foreground sm:text-xl">{description}</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
            <Button
              size="lg"
              className="min-w-[200px] bg-primary text-primary-foreground shadow-[var(--shadow-mint-hard)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </Button>
            {secondaryAction ? (
              <Button
                variant="outline"
                size="lg"
                onClick={secondaryAction.onClick}
                className="min-w-[200px] border-border bg-card/70 text-foreground hover:bg-card disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        </div>

        {illustration ? (
          <div className="relative isolate flex items-center justify-center">
            <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            {illustration}
          </div>
        ) : null}
      </div>
    </section>
  )
}
