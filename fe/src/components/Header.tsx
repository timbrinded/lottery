import { Link } from '@tanstack/react-router'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { HelpCircle, LayoutDashboard, Ticket } from 'lucide-react'
import NetworkSwitcher from './NetworkSwitcher'
import { HowItWorksModal } from './shared/HowItWorksModal'
import { Button } from './ui/button'

export default function Header() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
        <h1 className="text-xl font-semibold flex-1">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🎁</span>
            <span className="hidden sm:inline">Mystery Lottery</span>
          </Link>
        </h1>
        
        <nav className="hidden md:flex items-center gap-2 mr-4">
          <Link to="/manager">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manager
            </Button>
          </Link>
          <Link to="/participant">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              <Ticket className="mr-2 h-4 w-4" />
              Participant
            </Button>
          </Link>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHowItWorks(true)}
            className="text-white hover:bg-gray-700"
            aria-label="How it works"
          >
            <HelpCircle size={20} />
          </Button>
          <NetworkSwitcher />
          <ConnectButton showBalance={false} chainStatus="none" />
        </div>
      </header>

      <HowItWorksModal open={showHowItWorks} onOpenChange={setShowHowItWorks} />
    </>
  )
}
