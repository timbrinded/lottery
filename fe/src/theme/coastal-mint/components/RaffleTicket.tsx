import { cn } from '@/lib/utils'

type TicketStatus = 'unclaimed' | 'claimed' | 'pending' | 'settling'

type RaffleTicketProps = {
  drawId: string
  poolEth: string
  entries: number
  status: TicketStatus
  claimedPrizes?: number
  totalPrizes?: number
  claimPercent?: number
  className?: string
}

const STATUS_MAP: Record<TicketStatus, { label: string; badgeClass: string }> = {
  unclaimed: { label: 'Claim open', badgeClass: 'ticket-status-warning' },
  claimed: { label: 'All prizes claimed', badgeClass: 'ticket-status-success' },
  pending: { label: 'Pending reveal', badgeClass: 'ticket-status-destructive' },
  settling: { label: 'Awaiting finalization', badgeClass: 'ticket-status-warning' },
}

export function RaffleTicket({
  drawId,
  poolEth,
  entries,
  status,
  claimedPrizes = 0,
  totalPrizes = 0,
  claimPercent = 0,
  className,
}: RaffleTicketProps) {
  const statusInfo = STATUS_MAP[status]
  const displayClaimPercent =
    totalPrizes > 0 ? `${Math.min(Math.max(claimPercent, 0), 100)}%` : 'Pending'
  const claimSummary =
    totalPrizes > 0
      ? `${claimedPrizes} of ${totalPrizes} prizes redeemed`
      : 'Reveal to assign prize claims'

  return (
    <article className={cn('ticket isolate overflow-hidden px-8 py-6', className)}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Lottery Draw
          </span>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">{drawId}</h3>
        </div>
        <span
          className={cn(
            'ticket-status inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            statusInfo.badgeClass,
          )}
        >
          {statusInfo.label}
        </span>
      </header>

      <div className="ticket-body mt-6 grid gap-6 rounded-[20px] border border-border/50 px-6 py-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Prize Pool
          </p>
          <p className="text-3xl font-semibold text-foreground">{poolEth}</p>
          <p className="text-sm text-muted-foreground/80">
            Winner receives the entire current pool when the reveal concludes.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Prize Claims
          </p>
          <p className="text-3xl font-semibold text-foreground">{displayClaimPercent}</p>
          <p className="text-sm text-muted-foreground/70">{claimSummary}</p>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground/80">
            <span className="uppercase tracking-[0.2em]">Entries committed</span>
            <span className="font-mono text-sm text-foreground">{entries}</span>
          </div>
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap justify-between gap-4 text-xs font-mono text-muted-foreground/80">
        <span>Commit hash stored on-chain</span>
        <span className="uppercase tracking-[0.35em]">Minted for fairness</span>
      </footer>
    </article>
  )
}

