import { cn } from '@/lib/utils'

type TicketStatus = 'unclaimed' | 'claimed' | 'pending' | 'settling'

type RaffleTicketProps = {
  drawId: string
  poolEth: string
  committedEntries?: number
  totalEntries?: number
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
  committedEntries = 0,
  totalEntries,
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
  const committedCount = Math.max(committedEntries, 0)
  const totalCount = Math.max(totalEntries ?? committedCount, 0)
  const clampedCommitted = totalCount > 0 ? Math.min(committedCount, totalCount) : committedCount
  const entriesDisplay =
    totalCount > 0
      ? `${clampedCommitted.toLocaleString()} / ${totalCount.toLocaleString()}`
      : clampedCommitted.toLocaleString()

  return (
    <article 
      className={cn('ticket isolate px-8 py-6 relative', className)}
      style={{
        backgroundImage: 'url(/parchment.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '2px solid rgba(120, 53, 15, 0.3)',
        borderRadius: '16px',
        // Mask to create cutouts on the sides (centered vertically)
        WebkitMaskImage: 'radial-gradient(circle 24px at 0 50%, transparent 0, transparent 24px, black 25px), radial-gradient(circle 24px at 100% 50%, transparent 0, transparent 24px, black 25px)',
        WebkitMaskComposite: 'source-in',
        maskImage: 'radial-gradient(circle 24px at 0 50%, transparent 0, transparent 24px, black 25px), radial-gradient(circle 24px at 100% 50%, transparent 0, transparent 24px, black 25px)',
        maskComposite: 'intersect',
      }}
    >
      {/* Hide the default pseudo-element cutouts */}
      <style>{`
        .ticket::before,
        .ticket::after {
          display: none !important;
        }
      `}</style>
      
      {/* Parchment overlay for better text contrast */}
      <div 
        className="absolute inset-0 bg-amber-50/40 mix-blend-overlay pointer-events-none rounded-[16px]"
        style={{
          WebkitMaskImage: 'radial-gradient(circle 24px at 0 50%, transparent 0, transparent 24px, black 25px), radial-gradient(circle 24px at 100% 50%, transparent 0, transparent 24px, black 25px)',
          WebkitMaskComposite: 'source-in',
          maskImage: 'radial-gradient(circle 24px at 0 50%, transparent 0, transparent 24px, black 25px), radial-gradient(circle 24px at 100% 50%, transparent 0, transparent 24px, black 25px)',
          maskComposite: 'intersect',
        }}
        aria-hidden="true" 
      />
      
      <header className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.4em] text-amber-900/70" style={{ fontFamily: '"Caveat", cursive' }}>
            LAST DRAW
          </span>
          <h3 className="mt-2 text-2xl font-bold text-amber-950" style={{ fontFamily: '"Caveat", cursive' }}>{drawId}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'ticket-status inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
              statusInfo.badgeClass,
            )}
          >
            {statusInfo.label}
          </span>
          <div className="opacity-60 shrink-0">
            <img src="/iso/lg/ticket.png" alt="" className="w-24 h-24 object-contain rounded-lg" />
          </div>
        </div>
      </header>

      <div className="ticket-body mt-6 grid gap-6 rounded-[20px] border-2 border-amber-900/30 bg-amber-50/30 px-6 py-5 lg:grid-cols-[1.1fr_1fr] relative z-10 shadow-inner">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src="/iso/sm/coins.png" alt="" className="w-4 h-4 object-contain opacity-70" />
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-900/70" style={{ fontFamily: '"Caveat", cursive' }}>
              Prize Pool
            </p>
          </div>
          <p className="text-3xl font-bold text-amber-950" style={{ fontFamily: '"Caveat", cursive' }}>{poolEth}</p>
          <p className="text-sm text-amber-900/80" style={{ fontFamily: '"Caveat", cursive' }}>
            Each winner receives the prize set by manager
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src="/iso/sm/chest.png" alt="" className="w-4 h-4 object-contain opacity-70" />
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-900/70" style={{ fontFamily: '"Caveat", cursive' }}>
              Prize Claims
            </p>
          </div>
          <p className="text-3xl font-bold text-amber-950" style={{ fontFamily: '"Caveat", cursive' }}>{displayClaimPercent}</p>
          <p className="text-sm text-amber-900/70" style={{ fontFamily: '"Caveat", cursive' }}>{claimSummary}</p>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-900/10 px-3 py-2 text-xs text-amber-900/80 border border-amber-900/20">
            <span className="uppercase tracking-[0.2em]" style={{ fontFamily: '"Caveat", cursive' }}>Tickets committed</span>
            <span className="text-sm font-bold text-amber-950" style={{ fontFamily: '"Caveat", cursive' }}>{entriesDisplay}</span>
          </div>
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap justify-between gap-4 text-xs text-amber-900/70 relative z-10" style={{ fontFamily: '"Caveat", cursive' }}>
        <span>Commit hash stored on-chain</span>
        <span className="uppercase tracking-[0.35em]">Minted for fairness</span>
      </footer>
    </article>
  )
}
