import { createFileRoute, Link } from '@tanstack/react-router'
import { NetworkEnforcementBanner } from '@/components/shared/NetworkEnforcementBanner'
import { useNetworkEnforcement } from '@/hooks/useNetworkEnforcement'
import { useIsLotteryManager } from '@/hooks/useIsLotteryManager'
import { Button } from '@/components/ui/button'
import { Ticket, Crown } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { isCorrectNetwork } = useNetworkEnforcement()
  const { isManager, isLoading } = useIsLotteryManager()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <NetworkEnforcementBanner />
        
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-white tracking-tight">
              🎁 Mystery Lottery
            </h1>
            <p className="text-2xl text-purple-200 font-light">
              Fair & Transparent Prize Distribution
            </p>
          </div>

          {/* Navigation Buttons - Only show when connected to correct network */}
          {isCorrectNetwork && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {isManager && (
                  <Link to="/manager" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto min-w-[280px] h-16 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200"
                      disabled={isLoading}
                    >
                      <Crown className="mr-3" size={24} />
                      Manager Dashboard
                    </Button>
                  </Link>
                )}
                
                <Link to="/ticket" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant={isManager ? "outline" : "default"}
                    className={
                      isManager
                        ? "w-full sm:w-auto min-w-[280px] h-16 text-lg border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50 hover:text-white transition-all duration-200"
                        : "w-full sm:w-auto min-w-[280px] h-16 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200"
                    }
                  >
                    <Ticket className="mr-3" size={24} />
                    Participant Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto space-y-6 text-lg text-gray-200">
            <p className="leading-relaxed">
              A decentralized lottery platform on Arc blockchain that uses a commit-reveal pattern 
              to ensure fairness and prevent gaming.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-xl font-semibold text-white mb-2">Commit-Reveal</h3>
                <p className="text-sm text-gray-300">
                  Cryptographic fairness ensures no one knows winners before distribution
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-xl font-semibold text-white mb-2">Low Gas Fees</h3>
                <p className="text-sm text-gray-300">
                  Built on Arc blockchain with optimized gas costs and USDC prizes
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-xl font-semibold text-white mb-2">Prize Cascade</h3>
                <p className="text-sm text-gray-300">
                  Uncommitted tickets don't lock prizes - they cascade to active participants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
