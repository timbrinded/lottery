import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NetworkEnforcementBanner } from '@/components/shared/NetworkEnforcementBanner'
import { useNetworkEnforcement } from '@/hooks/useNetworkEnforcement'
import { useIsLotteryManager } from '@/hooks/useIsLotteryManager'
import { useLatestLottery } from '@/hooks/useLatestLottery'
import type { LatestLotteryData } from '@/hooks/useLatestLottery'
import { useFriendlyTime, getRelativeTime } from '@/hooks/useFriendlyTime'
import { HeroSplash } from '@/theme/coastal-mint/components/HeroSplash'
import { DashboardGrid } from '@/theme/coastal-mint/components/DashboardGrid'
import { StatCard } from '@/theme/coastal-mint/components/StatCard'
import { RaffleTicket } from '@/theme/coastal-mint/components/RaffleTicket'
import { ProofPanel } from '@/theme/coastal-mint/components/ProofPanel'
import { formatEther } from 'viem'

type FeatureCardProps = {
  emoji: string
  title: string
  description: string
}

const featureCards: FeatureCardProps[] = [
  {
    emoji: '/iso/chain.png',
    title: 'Provably Fair Giveaways',
    description:
      'Every draw is sealed and publicly auditable, so partners can prove results to legal, finance, and community teams.',
  },
  {
    emoji: '/iso/bird.png',
    title: 'Launch Campaigns Fast',
    description:
      'Prebuilt manager and participant journeys mean new promotions spin up in minutes without custom engineering.',
  },
  {
    emoji: '/iso/coins.png',
    title: 'Sponsor-Friendly Costs',
    description:
      'Cover fees yourself or let players pay—flexible funding keeps campaigns on budget while modern infrastructure keeps costs low.',
  },
  // {
  //   emoji: '/iso/lighthouse.png',
  //   title: 'Clear Post-Campaign Reporting',
  //   description:
  //     'Live pool stats and exportable attestations make it simple to recap performance with investors, partners, and brand stakeholders.',
  // },
]

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const navigate = useNavigate()
  const { isCorrectNetwork } = useNetworkEnforcement()
  const { isManager, isLoading } = useIsLotteryManager()
  const { lottery: latestLottery, isLoading: isLatestLoading } = useLatestLottery()

  const heroPrimaryLabel = isManager ? 'Open Manager Dashboard' : 'Enter Participant View'
  const heroPrimaryTarget = isManager ? '/manager' : '/participant'

  const heroSecondary = isManager
    ? {
        label: 'View Participant Experience',
        onClick: () => navigate({ to: '/participant' }),
      }
    : {
        label: 'Create a Lottery',
        onClick: () => navigate({ to: '/manager/create' }),
      }

  const milestone = getNextMilestone(latestLottery)
  const countdown = useFriendlyTime(milestone.target ?? 0, {
    suffix: milestone.target ? 'left' : '',
  })

  const formattedId = latestLottery ? formatLotteryId(latestLottery.id) : null

  const prizeValue = isLatestLoading
    ? '—'
    : latestLottery
      ? `${formatEther(latestLottery.totalPrizePool)} USDC`
      : 'Waiting for first draw'
  const prizeHint = latestLottery ? `Draw ${formattedId}` : milestone.hint

  const timeValue = (() => {
    if (isLatestLoading) return '—'
    if (!latestLottery) return 'No draw'
    if (milestone.target && !countdown.isPast) {
      return formatDurationCompact(countdown.timeRemaining)
    }
    const descriptor = milestone.target ? milestone.pastDueValue : milestone.idleValue
    return compactMilestoneLabel(descriptor)
  })()
  const timeHint = milestone.hint

  const totalPrizes = latestLottery?.totalPrizes ?? 0
  const claimedPrizes = latestLottery?.claimedPrizes ?? 0
  const claimPercentage = latestLottery?.claimPercentage ?? 0

  const claimValue = isLatestLoading
    ? '—'
    : latestLottery
      ? totalPrizes > 0
        ? `${claimPercentage}%`
        : 'Pending'
      : 'Pending'
  const claimHint = latestLottery
    ? totalPrizes > 0
      ? `Prizes claimed: ${claimedPrizes}/${totalPrizes}`
      : 'Reveal to assign prizes'
    : 'Reveal to assign prizes'

  const stageValue = isLatestLoading ? '—' : getStageLabel(latestLottery)
  const stageHint = latestLottery
    ? `Created ${getRelativeTime(latestLottery.createdAt)} • ${latestLottery.ticketCount.toLocaleString()} tickets`
    : 'Create a lottery to populate stats'

  const raffleDrawId = formattedId ?? 'No draw yet'
  const rafflePool = isLatestLoading
    ? '—'
    : latestLottery
      ? `${formatEther(latestLottery.totalPrizePool)} USDC`
      : '—'
  const raffleEntries = latestLottery?.ticketCount ?? 0
  const raffleStatus = getTicketStatus(latestLottery)
  const raffleClaimPercent = latestLottery?.claimPercentage ?? 0
  const proofItems = getProofItems(latestLottery)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <NetworkEnforcementBanner />

          <HeroSplash
            eyebrow="Minted experiences for trustless draws"
            title="Mystery Lottery"
            description="A calm-but-premium lottery experience built on Arc. Commit-reveal transparency, live pool tracking, and participant flows that feel trustworthy."
            primaryAction={{
              label: heroPrimaryLabel,
              onClick: () => navigate({ to: heroPrimaryTarget }),
              disabled: !isCorrectNetwork || isLoading,
            }}
            secondaryAction={{
              ...heroSecondary,
              disabled: !isCorrectNetwork,
            }}
            illustration={
              <div className="relative flex h-full w-full max-w-lg items-center justify-center">
                <div className="absolute h-64 w-64 rounded-full bg-mint-soft/40 blur-3xl animate-pulse" aria-hidden="true" />
                <img
                  src="/hero2.png"
                  alt="Mystery Lottery Hero"
                  className="relative h-auto w-full max-w-md rounded-3xl drop-shadow-2xl opacity-95"
                />
              </div>
            }
          />

          {isCorrectNetwork ? (
            <DashboardGrid
              stats={
                <div className="grid grid-cols-12 gap-4 md:gap-6">
                  <StatCard
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    label="Prize pool"
                    value={prizeValue}
                    hint={prizeHint}
                    icon={<img src="/iso/coins.png" alt="" className="w-5 h-5 object-contain" />}
                  />
                  <StatCard
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    label="Time left"
                    value={timeValue}
                    hint={timeHint}
                    icon={<img src="/iso/hourglass.png" alt="" className="w-5 h-5 object-contain" />}
                  />
                  <StatCard
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    label="Prizes claimed"
                    value={claimValue}
                    hint={claimHint}
                    icon={<img src="/iso/chest.png" alt="" className="w-5 h-5 object-contain" />}
                  />
                  <StatCard
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                    label="Lottery stage"
                    value={stageValue}
                    hint={stageHint}
                    icon={<img src="/iso/chain.png" alt="" className="w-5 h-5 object-contain" />}
                  />
                </div>
              }
              main={
                <>
                  <RaffleTicket
                    drawId={raffleDrawId}
                    poolEth={rafflePool}
                    entries={raffleEntries}
                    status={raffleStatus}
                    claimedPrizes={claimedPrizes}
                    totalPrizes={totalPrizes}
                    claimPercent={raffleClaimPercent}
                  />
                  <ProofPanel proofs={proofItems} />
                </>
              }
            />
          ) : null}

          <section className="rounded-[32px] border border-border/60 bg-card/90 px-8 py-10 shadow-[var(--shadow-mint-soft)]">
            <div className="grid gap-8 lg:grid-cols-3">
              {featureCards.map((card) => (
                <FeatureCard key={card.title} {...card} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ emoji, title, description }: FeatureCardProps) {
  return (
    <article className="mint-sheen flex flex-col gap-3 rounded-[24px] border border-border/50 bg-background/70 p-6 shadow-[var(--shadow-mint-soft)] backdrop-blur">
      <img src={emoji} alt="" className="w-12 h-12 object-contain" />
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </article>
  )
}

type NextMilestone = {
  target: number | null
  hint: string
  pastDueValue: string
  idleValue: string
}

function getNextMilestone(lottery: LatestLotteryData | null): NextMilestone {
  if (!lottery) {
    return {
      target: null,
      hint: 'Create a lottery to populate stats',
      pastDueValue: 'Waiting for first draw',
      idleValue: 'Waiting for first draw',
    }
  }

  const now = Math.floor(Date.now() / 1000)

  if (lottery.state === 0) {
    return {
      target: Number(lottery.commitDeadline),
      hint: 'Commit window opens',
      pastDueValue: 'Awaiting kickoff',
      idleValue: 'Awaiting kickoff',
    }
  }

  if (lottery.state === 1) {
    if (now < Number(lottery.commitDeadline)) {
      return {
        target: Number(lottery.commitDeadline),
        hint: 'Commit window closes',
        pastDueValue: 'Awaiting reveal',
        idleValue: 'Awaiting reveal',
      }
    }
    if (now < Number(lottery.revealTime)) {
      return {
        target: Number(lottery.revealTime),
        hint: 'Reveal expected',
        pastDueValue: 'Reveal pending',
        idleValue: 'Reveal pending',
      }
    }
    return {
      target: null,
      hint: 'Reveal pending',
      pastDueValue: 'Reveal pending',
      idleValue: 'Reveal pending',
    }
  }

  if (lottery.state === 2) {
    const claimDeadline = Number(lottery.claimDeadline)
    if (claimDeadline > 0 && now < claimDeadline) {
      return {
        target: claimDeadline,
        hint: 'Claim window closes',
        pastDueValue: 'Claim window closed',
        idleValue: 'Claim window closes',
      }
    }
    return {
      target: null,
      hint: 'Claim window closed',
      pastDueValue: 'Claim window closed',
      idleValue: 'Claim window closed',
    }
  }

  if (lottery.state === 3) {
    return {
      target: null,
      hint: 'All prizes settled',
      pastDueValue: 'Finalized',
      idleValue: 'Finalized',
    }
  }

  return {
    target: null,
    hint: 'Lottery status unavailable',
    pastDueValue: '—',
    idleValue: '—',
  }
}

function formatLotteryId(id: bigint): string {
  const numericId = id.toString()
  return `#${numericId.padStart(5, '0')}`
}

function getStageLabel(lottery: LatestLotteryData | null): string {
  if (!lottery) {
    return 'No draw'
  }

  if (lottery.state === 0) {
    return 'Pending'
  }

  if (lottery.state === 1) {
    const now = Math.floor(Date.now() / 1000)
    if (now >= Number(lottery.commitDeadline)) {
      return 'Reveal pending'
    }
    return 'Commit open'
  }

  if (lottery.state === 2) {
    const now = Math.floor(Date.now() / 1000)
    const claimDeadline = Number(lottery.claimDeadline)
    if (lottery.allPrizesClaimed) {
      return claimDeadline > 0 && now < claimDeadline ? 'All prizes claimed' : 'Awaiting finalization'
    }
    if (claimDeadline > 0 && now >= claimDeadline) {
      return 'Claim closed'
    }
    return 'Claim open'
  }

  if (lottery.state === 3) {
    return 'Finalized'
  }

  return 'Unknown'
}

function getTicketStatus(
  lottery: LatestLotteryData | null,
): 'pending' | 'unclaimed' | 'claimed' | 'settling' {
  if (!lottery) {
    return 'pending'
  }

  if (lottery.state === 3 || lottery.allPrizesClaimed) {
    return 'claimed'
  }

  if (lottery.state === 2) {
    const now = Math.floor(Date.now() / 1000)
    const claimDeadline = Number(lottery.claimDeadline)
    if (claimDeadline > 0 && now >= claimDeadline) {
      return 'settling'
    }
    return 'unclaimed'
  }

  if (lottery.state === 3) {
    return 'claimed'
  }

  return 'pending'
}

function getProofItems(
  lottery: LatestLotteryData | null,
): { label: string; value: string }[] {
  if (!lottery) {
    return [
      { label: 'Commit hash', value: 'No lottery yet' },
      { label: 'Random seed', value: 'No lottery yet' },
      { label: 'Tickets committed', value: '0' },
      { label: 'Prizes claimed', value: 'Awaiting reveal' },
    ]
  }

  return [
    { label: 'Commit hash', value: truncateMiddle(lottery.creatorCommitment) },
    { label: 'Random seed', value: formatRandomSeed(lottery.randomSeed) },
    { label: 'Tickets committed', value: lottery.ticketCount.toLocaleString() },
    { label: 'Prizes claimed', value: formatPrizeClaims(lottery) },
  ]
}

function formatRandomSeed(seed: bigint): string {
  if (seed === 0n) {
    return 'Pending reveal'
  }
  const hex = `0x${seed.toString(16).padStart(64, '0')}`
  return truncateMiddle(hex)
}

function truncateMiddle(value: string, front = 6, back = 4): string {
  if (value.length <= front + back + 3) {
    return value
  }
  return `${value.slice(0, front)}...${value.slice(-back)}`
}

function formatPrizeClaims(lottery: LatestLotteryData): string {
  if (lottery.totalPrizes === 0) {
    return 'Awaiting reveal'
  }
  const summary = `${lottery.claimedPrizes}/${lottery.totalPrizes}`
  return lottery.allPrizesClaimed ? `${summary} (100%)` : `${summary} (${lottery.claimPercentage}%)`
}

function formatDurationCompact(seconds: number): string {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '—'
  }

  const remaining = Math.max(seconds, 0)
  if (remaining === 0) {
    return 'Closed'
  }

  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const secs = Math.floor(remaining % 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function compactMilestoneLabel(label: string): string {
  const normalized = label.toLowerCase()
  if (normalized.includes('closed')) {
    return 'Closed'
  }
  if (normalized.includes('pending')) {
    return 'Pending'
  }
  if (normalized.includes('awaiting')) {
    return 'Waiting'
  }
  if (normalized.includes('closes')) {
    return 'Closing soon'
  }
  if (normalized.includes('ready')) {
    return 'Ready'
  }
  if (normalized.includes('finalized')) {
    return 'Finalized'
  }
  if (normalized.includes('reveal')) {
    return 'Reveal'
  }
  return label
}
