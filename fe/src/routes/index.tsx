import { createFileRoute } from '@tanstack/react-router'
import logo from '../logo.svg'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-white tracking-tight">
              🎁 Mystery Lottery
            </h1>
            <p className="text-2xl text-purple-200 font-light">
              Fair & Transparent Prize Distribution
            </p>
          </div>

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

            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-sm text-gray-400">
                Coming soon: Create lotteries, distribute tickets, and claim prizes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
