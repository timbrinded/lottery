import { cn } from '@/lib/utils'

type ProofItem = {
  label: string
  value: string
  href?: string
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
        'rounded-[24px] border border-border/60 bg-card px-6 py-6 shadow-[var(--shadow-mint-soft)] backdrop-blur relative overflow-hidden',
        className,
      )}
    >
      <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
        <img src="/iso/lg/chain.png" alt="" className="w-20 h-20 object-contain" />
      </div>
      <div className="flex items-center gap-2">
        <img src="/iso/sm/chain.png" alt="" className="w-4 h-4 object-contain opacity-70" />
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{kicker}</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold text-foreground relative z-10">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground relative z-10">{description}</p>

      <div className="mt-6 space-y-3 rounded-[18px] border border-border/40 bg-secondary/40 p-4 font-mono text-xs text-muted-foreground relative z-10">
        {proofs.map((item) => {
          const contentClassName =
            'overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-background px-2 py-1 text-foreground shadow-inner'

          return (
            <div key={item.label} className="space-y-1">
              <span className="uppercase tracking-[0.3em] text-muted-foreground/70">{item.label}</span>
              {item.href
                ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${contentClassName} transition-colors underline decoration-dotted underline-offset-2 hover:text-primary`}
                  >
                    {item.value}
                  </a>
                )
                : (
                  <div className={contentClassName}>{item.value}</div>
                )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
