import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Construction, ExternalLink } from 'lucide-react'
import { useChainId } from 'wagmi'
import { useNavigate } from '@tanstack/react-router'

export function ContractNotDeployed() {
  const chainId = useChainId()
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🏗️</div>
          <CardTitle className="text-2xl">Contract Not Deployed Yet</CardTitle>
          <CardDescription className="text-base mt-2">
            The Blottery smart contract hasn't been deployed to this network yet. We're working on it!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Construction className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Current Network: Chain ID {chainId}</p>
              <p className="text-sm">
                The lottery contract is currently only available on specific networks. Please switch to a supported
                network or check back later!
              </p>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-mint-success bg-mint-success p-4 text-sm">
            <p className="mb-2 font-semibold text-mint-success">🎯 Supported Networks:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Arc Testnet (Chain ID: 1234) - Coming Soon</li>
              <li>Arc Mainnet (Chain ID: 5678) - Coming Soon</li>
            </ul>
          </div>

          <div className="rounded-lg border border-mint-accent bg-mint-accent p-4 text-sm">
            <p className="mb-2 font-semibold text-mint-accent">👨‍💻 For Developers:</p>
            <p className="mb-2 text-muted-foreground">
              Want to deploy the contract yourself? Check out the deployment instructions in the repository.
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <a
                href="https://github.com/timbrinded/lottery"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                View on GitHub
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div className="flex justify-center">
            <Button onClick={() => navigate({ to: '/' })} variant="outline">
              Go Back Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
