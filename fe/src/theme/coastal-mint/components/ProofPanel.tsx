import { cn } from '@/lib/utils'

type ProofItem = {
  label: string
  value: string
}

type ProofPanelProps = {
  title?: string
  kicker?: string
  description?: string
  proofs: ProofItem[]
  className?: string
}

export function ProofPanel({
  title = 'Proof of Fairness',
  kicker = 'Commit & Reveal',
  description = 'Hashes are checked on-chain to guarantee every ticket is revealed before prizes unlock.',
  proofs,
  className,
}: ProofPanelProps) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-border/60 bg-card px-6 py-6 shadow-[var(--shadow-mint-soft)] backdrop-blur',
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{kicker}</span>
      <h3 className="mt-3 text-2xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 space-y-3 rounded-[18px] border border-border/40 bg-secondary/40 p-4 font-mono text-xs text-muted-foreground">
        {proofs.map((item) => (
          <div key={item.label} className="space-y-1">
            <span className="uppercase tracking-[0.3em] text-muted-foreground/70">{item.label}</span>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-background px-2 py-1 text-foreground shadow-inner">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
