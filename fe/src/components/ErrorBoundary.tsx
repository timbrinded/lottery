import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    // Use window.location.reload() for full page refresh (appropriate for error recovery)
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    // For class components, we use window.location for navigation
    // Note: Could be refactored to functional component with useNavigate in the future
    window.location.href = '/'
  }

  getHumorousMessage(error: Error | null): { title: string; message: string; emoji: string } {
    const errorMessage = error?.message || ''

    // Contract not deployed error
    if (errorMessage.includes('contract not deployed') || errorMessage.includes('not deployed on chain')) {
      return {
        emoji: '🏗️',
        title: 'Oops! The Lottery Factory is Still Under Construction',
        message:
          "Looks like our smart contract hasn't moved into this blockchain neighborhood yet. It's probably still looking for parking. Try switching to a supported network or check back after we've deployed!",
      }
    }

    // Network/chain errors
    if (errorMessage.includes('chain') || errorMessage.includes('network')) {
      return {
        emoji: '🌐',
        title: 'Wrong Neighborhood!',
        message:
          "You're connected to a blockchain we don't support yet. It's like showing up to a pizza party with sushi - technically food, but not quite right. Switch to Arc blockchain and try again!",
      }
    }

    // Wallet errors
    if (errorMessage.includes('wallet') || errorMessage.includes('account')) {
      return {
        emoji: '👛',
        title: 'Wallet Went on Vacation',
        message:
          "Your wallet seems to have disconnected. Maybe it needed a break? Reconnect and let's get back to the lottery action!",
      }
    }

    // Transaction errors
    if (errorMessage.includes('transaction') || errorMessage.includes('gas')) {
      return {
        emoji: '⛽',
        title: 'Transaction Troubles',
        message:
          "Something went wrong with your transaction. Maybe the blockchain had a hiccup, or you ran out of gas (the digital kind). Give it another shot!",
      }
    }

    // Generic fallback
    return {
      emoji: '🎲',
      title: 'Well, This is Awkward...',
      message:
        "Something unexpected happened. Even our error messages are confused. But hey, at least you found this easter egg of an error page! Try refreshing or heading home.",
    }
  }

  render() {
    if (this.state.hasError) {
      const { emoji, title, message } = this.getHumorousMessage(this.state.error)

      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">{emoji}</div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Technical details (collapsible) */}
              {this.state.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <details className="cursor-pointer">
                      <summary className="font-semibold mb-2">Technical Details (for the nerds)</summary>
                      <pre className="text-xs overflow-auto bg-gray-900 text-gray-100 p-3 rounded mt-2">
                        {this.state.error.message}
                        {this.state.errorInfo && `\n\n${this.state.errorInfo}`}
                      </pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={this.handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>

              {/* Helpful tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-900 mb-2">💡 Quick Fixes:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Make sure you're connected to the Arc blockchain</li>
                  <li>Check that your wallet is connected</li>
                  <li>Try refreshing the page</li>
                  <li>If all else fails, blame the blockchain (we do)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
