import { useChainId, useSwitchChain } from 'wagmi'
import { useState } from 'react'
import { ChevronDown, Check, Wifi } from 'lucide-react'
import { localhost, arcTestnet, arcMainnet, availableChains } from '@/lib/wagmi'

export default function NetworkSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const getNetworkInfo = (id: number) => {
    if (id === localhost.id) {
      return {
        name: 'Localhost',
        color: 'bg-purple-500',
        icon: '🔧',
        chain: localhost,
      }
    }
    if (id === arcTestnet.id) {
      return {
        name: 'Arc Testnet',
        color: 'bg-blue-500',
        icon: '🧪',
        chain: arcTestnet,
      }
    }
    if (id === arcMainnet.id) {
      return {
        name: 'Arc Mainnet',
        color: 'bg-green-500',
        icon: '🌐',
        chain: arcMainnet,
      }
    }
    return {
      name: 'Unknown',
      color: 'bg-gray-500',
      icon: '❓',
      chain: null,
    }
  }

  const currentNetwork = getNetworkInfo(chainId)

  const handleSwitchNetwork = (targetChainId: number) => {
    switchChain({ chainId: targetChainId })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700/50 border border-gray-600 hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm">{currentNetwork.icon}</span>
        <span className="text-xs font-medium hidden sm:inline">
          {currentNetwork.name}
        </span>
        <div
          className={`w-2 h-2 rounded-full ${currentNetwork.color} animate-pulse`}
        />
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400">
                <Wifi size={14} />
                <span>Switch Network</span>
              </div>
            </div>
            <div className="p-1">
              {availableChains.map((chain) => {
                const info = getNetworkInfo(chain.id)
                const isActive = chain.id === chainId

                return (
                  <button
                    key={chain.id}
                    onClick={() => handleSwitchNetwork(chain.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-cyan-600 hover:bg-cyan-700'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{info.name}</div>
                      <div className="text-xs text-gray-400">
                        Chain ID: {chain.id}
                      </div>
                    </div>
                    {isActive && (
                      <Check size={16} className="text-cyan-300" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
