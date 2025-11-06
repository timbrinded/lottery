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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <h1 className="flex-1 text-xl font-semibold text-foreground">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary transition hover:bg-primary/20"
            >
              <img src="/iso/sm/ticket.png" alt="" className="w-5 h-5 object-contain" />
              <span className="hidden md:inline tracking-normal">Blottery</span>
            </Link>
          </h1>

          <nav className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-1 md:flex">
            <Link to="/manager">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-orange-100 hover:text-slate-700"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Manager
              </Button>
            </Link>
            <Link to="/participant">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Ticket className="mr-2 h-4 w-4" />
                Participant
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHowItWorks(true)}
              className="text-muted-foreground hover:bg-violet-50 hover:text-violet-950"
              aria-label="How it works"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              How It Works
            </Button>
          </nav>

          <div className="flex items-center gap-3">
            <NetworkSwitcher />
            <ConnectButton showBalance={false} chainStatus="none" />
          </div>
        </div>
      </header>

      <HowItWorksModal open={showHowItWorks} onOpenChange={setShowHowItWorks} />
    </>
  )
}
