import { createFileRoute } from '@tanstack/react-router'
import { useAccount, useReadContracts } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect, useMemo } from 'react'
import { useReadLotteryFactory, useWatchLotteryFactoryEvent, useLotteryFactoryAddress } from '@/contracts/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/shared/Countdown'
import { BlockCountdown } from '@/components/shared/BlockCountdown'
import { useCloseCommitPeriod } from '@/hooks/useCloseCommitPeriod'
import { useRevealLottery } from '@/hooks/useRevealLottery'
import { RevealLotteryModal } from '@/components/lottery/RevealLotteryModal'
import { ContractNotDeployed } from '@/components/ContractNotDeployed'
import { formatEther } from 'viem'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type LotteryState = 'Pending' | 'CommitOpen' | 'CommitClosed' | 'RevealOpen' | 'Finalized'

interface LotteryData {
  id: bigint
  creator: string
  creatorCommitment: `0x${string}`
  totalPrizePool: bigint
  numberOfTickets: bigint
  commitDeadline: bigint
  revealTime: bigint
  claimDeadline: bigint
  randomnessBlock: bigint
  state: number
  createdAt: bigint
}

function DashboardPage() {
  const { address, isConnected } = useAccount()
  const contractAddress = useLotteryFactoryAddress()
  const [lotteries, setLotteries] = useState<LotteryData[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'pending-reveal' | 'waiting-randomness' | 'revealed' | 'finalized'>('all')

  // Get lottery counter to know how many lotteries exist
  const { data: lotteryCounter, isLoading: isCounterLoading } = useReadLotteryFactory('lotteryCounter', [])

  // Build contract calls for all lotteries
  const lotteryIds = useMemo(() => {
    if (!lotteryCounter) return []
    const count = Number(lotteryCounter)
    const ids = []
    for (let i = 1; i < count; i++) {
      ids.push(BigInt(i))
    }
    return ids
  }, [lotteryCounter])

  // Fetch all lottery data in parallel
  const { data: lotteriesData, isLoading: isLotteriesLoading } = useReadContracts({
    contracts: lotteryIds.map(id => ({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: 'lotteries',
      args: [id],
    })),
    query: {
      enabled: !!contractAddress && lotteryIds.length > 0,
    },
  })

  // Fetch ticket counts for each lottery
  const { data: ticketCountsData } = useReadContracts({
    contracts: lotteryIds.map(id => ({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: 'getLotteryTickets',
      args: [id],
    })),
    query: {
      enabled: !!contractAddress && lotteryIds.length > 0,
    },
  })

  // Process lottery data and filter by creator
  useEffect(() => {
    if (!lotteriesData || !address) {
      setLotteries([])
      return
    }

    const userLotteries: LotteryData[] = []

    lotteriesData.forEach((result, index) => {
      if (result.status === 'success' && result.result) {
        // Contract returns tuple as array: [creator, creatorCommitment, totalPrizePool, commitDeadline, randomnessBlock, revealTime, claimDeadline, randomSeed, state, createdAt, sponsoredGasPool, sponsoredGasUsed]
        const lotteryData = result.result as any[]
        
        // Check if we have valid data
        if (!lotteryData || lotteryData.length < 10) {
          console.warn(`Invalid lottery data for ID ${lotteryIds[index]}`)
          return
        }

        const creator = lotteryData[0] as string
        
        // Only include lotteries created by the connected user
        if (creator && creator.toLowerCase() === address.toLowerCase()) {
          const ticketCount = ticketCountsData?.[index]?.status === 'success' 
            ? (ticketCountsData[index].result as any[]).length 
            : 0

          userLotteries.push({
            id: lotteryIds[index],
            creator: creator,
            creatorCommitment: lotteryData[1] as `0x${string}`,
            totalPrizePool: lotteryData[2] as bigint,
            numberOfTickets: BigInt(ticketCount),
            commitDeadline: lotteryData[3] as bigint,
            revealTime: lotteryData[5] as bigint,
            claimDeadline: lotteryData[6] as bigint,
            randomnessBlock: lotteryData[4] as bigint,
            state: Number(lotteryData[8]),
            createdAt: lotteryData[9] as bigint,
          })
        }
      }
    })

    setLotteries(userLotteries)
  }, [lotteriesData, ticketCountsData, address, lotteryIds])

  const isLoading = isCounterLoading || isLotteriesLoading

  // Watch for new lottery creation events
  useWatchLotteryFactoryEvent('LotteryCreated', (logs) => {
    if (!address) return
    
    logs.forEach((log: any) => {
      if (log.args.creator?.toLowerCase() === address.toLowerCase()) {
        // Add new lottery to the list
        // Note: creatorCommitment needs to be fetched from contract
        const newLottery: LotteryData = {
          id: log.args.lotteryId,
          creator: log.args.creator,
          creatorCommitment: '0x0000000000000000000000000000000000000000000000000000000000000000', // Fetch from contract
          totalPrizePool: log.args.totalPrizePool,
          numberOfTickets: log.args.numberOfTickets,
          commitDeadline: log.args.commitDeadline,
          revealTime: log.args.revealTime,
          claimDeadline: BigInt(0), // Will be set after reveal
          randomnessBlock: BigInt(0), // Will be set when commit closes
          state: 1, // CommitOpen
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
        }
        setLotteries(prev => [newLottery, ...prev])
      }
    })
  })

  const filteredLotteries = useMemo(() => {
    if (filter === 'all') return lotteries

    const now = Math.floor(Date.now() / 1000)
    
    return lotteries.filter(lottery => {
      const state = getStateString(lottery.state)
      
      switch (filter) {
        case 'active':
          return state === 'CommitOpen'
        case 'pending-reveal':
          return state === 'CommitClosed' && now >= Number(lottery.revealTime)
        case 'waiting-randomness':
          return state === 'CommitClosed' && now < Number(lottery.revealTime)
        case 'revealed':
          return state === 'RevealOpen'
        case 'finalized':
          return state === 'Finalized'
        default:
          return true
      }
    })
  }, [lotteries, filter])

  // Check if contract is deployed (after all hooks)
  if (!contractAddress) {
    return <ContractNotDeployed />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Lotteries</h1>
        <ConnectButton />
      </div>

      {!isConnected ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">
            Connect your wallet to view your lotteries
          </p>
          <ConnectButton />
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'pending-reveal' ? 'default' : 'outline'}
              onClick={() => setFilter('pending-reveal')}
            >
              Pending Reveal
            </Button>
            <Button
              variant={filter === 'waiting-randomness' ? 'default' : 'outline'}
              onClick={() => setFilter('waiting-randomness')}
            >
              Waiting for Randomness
            </Button>
            <Button
              variant={filter === 'revealed' ? 'default' : 'outline'}
              onClick={() => setFilter('revealed')}
            >
              Revealed
            </Button>
            <Button
              variant={filter === 'finalized' ? 'default' : 'outline'}
              onClick={() => setFilter('finalized')}
            >
              Finalized
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredLotteries.length === 0 ? (
            <Alert>
              <AlertDescription>
                {filter === 'all' 
                  ? "You haven't created any lotteries yet. Create your first lottery to get started!"
                  : `No lotteries found with filter: ${filter}`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLotteries.map(lottery => (
                <LotteryCard key={lottery.id.toString()} lottery={lottery} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getStateString(state: number): LotteryState {
  const states: LotteryState[] = ['Pending', 'CommitOpen', 'CommitClosed', 'RevealOpen', 'Finalized']
  return states[state] || 'Pending'
}

function getStateBadgeVariant(state: LotteryState): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (state) {
    case 'CommitOpen':
      return 'default'
    case 'CommitClosed':
      return 'secondary'
    case 'RevealOpen':
      return 'default'
    case 'Finalized':
      return 'outline'
    default:
      return 'secondary'
  }
}

interface LotteryCardProps {
  lottery: LotteryData
}

function LotteryCard({ lottery }: LotteryCardProps) {
  const state = getStateString(lottery.state)
  const [showRevealModal, setShowRevealModal] = useState(false)
  
  const {
    closeCommit,
    isLoading: isClosing,
    isSuccess: closeSuccess,
    error: closeError,
    canClose,
  } = useCloseCommitPeriod({
    lotteryId: lottery.id,
    commitDeadline: Number(lottery.commitDeadline),
  })

  const {
    reveal,
    isLoading: isRevealing,
    isSuccess: revealSuccess,
    error: revealError,
    canReveal,
  } = useRevealLottery({
    lotteryId: lottery.id,
    randomnessBlock: lottery.randomnessBlock,
    revealTime: Number(lottery.revealTime),
  })

  const handleReveal = (secret: string) => {
    reveal(secret)
  }

  // Close modal on success
  useEffect(() => {
    if (revealSuccess) {
      setShowRevealModal(false)
    }
  }, [revealSuccess])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Lottery #{lottery.id.toString()}</CardTitle>
            <CardDescription>
              {formatEther(lottery.totalPrizePool)} ETH Prize Pool
            </CardDescription>
          </div>
          <Badge variant={getStateBadgeVariant(state)}>
            {state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tickets:</span>
            <span className="font-medium">{lottery.numberOfTickets.toString()}</span>
          </div>
          
          {state === 'CommitOpen' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Commit Deadline:</span>
              <Countdown deadline={Number(lottery.commitDeadline)} />
            </div>
          )}

          {state === 'CommitClosed' && lottery.randomnessBlock > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Randomness Block:</span>
              <span className="font-mono text-sm">{lottery.randomnessBlock.toString()}</span>
            </div>
          )}

          {(state === 'CommitClosed' || state === 'RevealOpen') && (
            <div className="flex justify-between">
              <span className="text-gray-600">Reveal Time:</span>
              <Countdown deadline={Number(lottery.revealTime)} />
            </div>
          )}

          {state === 'RevealOpen' && lottery.claimDeadline > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Claim Deadline:</span>
              <Countdown deadline={Number(lottery.claimDeadline)} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {state === 'CommitOpen' && canClose && (
            <Button
              onClick={closeCommit}
              disabled={isClosing}
              className="w-full"
              variant="outline"
            >
              {isClosing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                'Close Commit Period'
              )}
            </Button>
          )}

          {state === 'CommitClosed' && !canReveal && lottery.randomnessBlock > 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                Waiting for randomness block...
                <br />
                <BlockCountdown targetBlock={lottery.randomnessBlock} />
              </AlertDescription>
            </Alert>
          )}

          {state === 'CommitClosed' && canReveal && (
            <Button
              onClick={() => setShowRevealModal(true)}
              className="w-full"
            >
              Reveal Lottery
            </Button>
          )}

          {revealSuccess && (
            <Alert>
              <AlertDescription className="text-sm text-green-600">
                Lottery revealed successfully! Prizes have been assigned.
              </AlertDescription>
            </Alert>
          )}

          {revealError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {revealError.message}
              </AlertDescription>
            </Alert>
          )}

          {closeError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {closeError.message}
              </AlertDescription>
            </Alert>
          )}

          {closeSuccess && (
            <Alert>
              <AlertDescription className="text-sm text-green-600">
                Commit period closed successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Reveal Modal */}
      <RevealLotteryModal
        open={showRevealModal}
        onOpenChange={setShowRevealModal}
        lotteryId={lottery.id}
        creatorCommitment={lottery.creatorCommitment}
        onReveal={handleReveal}
        isRevealing={isRevealing}
        error={revealError}
      />
    </Card>
  )
}
