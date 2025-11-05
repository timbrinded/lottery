import { useChainId, useSwitchChain } from 'wagmi'
import { useState } from 'react'
import { ChevronDown, Check, Wifi } from 'lucide-react'
import { localhost, arcTestnet, availableChains } from '@/lib/wagmi'

export default function NetworkSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const getNetworkInfo = (id: number) => {
    if (id === localhost.id) {
      return { name: 'Localhost', color: 'bg-mint-accent', icon: '🔧', chain: localhost }
    }
    if (id === arcTestnet.id) {
      return { name: 'Arc Testnet', color: 'bg-primary', icon: '🧪', chain: arcTestnet }
    }
    // if (id === arcMainnet.id) {
    //   return {
    //     name: 'Arc Mainnet',
    //     color: 'bg-green-500',
    //     icon: '🌐',
    //     chain: arcMainnet,
    //   }
    // }
    return { name: 'Unknown', color: 'bg-muted', icon: '❓', chain: null }
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
        className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-mint-soft)] transition hover:bg-primary/10 hover:text-primary"
      >
        <span className="text-sm">{currentNetwork.icon}</span>
        <span className="text-xs font-medium hidden sm:inline">
          {currentNetwork.name}
        </span>
        <div className={`h-2 w-2 rounded-full ${currentNetwork.color} animate-pulse`} />
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
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-[var(--shadow-mint-soft)]">
            <div className="border-b border-border/60 p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'hover:bg-primary/10 text-muted-foreground'
                    }`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-foreground">{info.name}</div>
                      <div className="text-xs text-muted-foreground">Chain ID: {chain.id}</div>
                    </div>
                    {isActive && <Check size={16} className="text-primary" />}
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
