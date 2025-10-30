import { useState, useEffect } from 'react'
import { keccak256, toBytes } from 'viem'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'

interface RevealLotteryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotteryId: bigint
  creatorCommitment: `0x${string}`
  onReveal: (secret: string) => void
  isRevealing: boolean
  error: Error | null
}

export function RevealLotteryModal({
  open,
  onOpenChange,
  lotteryId,
  creatorCommitment,
  onReveal,
  isRevealing,
  error,
}: RevealLotteryModalProps) {
  const [secret, setSecret] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isValidSecret, setIsValidSecret] = useState(false)

  // Verify secret matches commitment locally
  useEffect(() => {
    if (!secret) {
      setIsValidSecret(false)
      setLocalError(null)
      return
    }

    try {
      // Hash the secret and compare with commitment
      const secretBytes = toBytes(secret)
      const secretHash = keccak256(secretBytes)
      
      if (secretHash === creatorCommitment) {
        setIsValidSecret(true)
        setLocalError(null)
      } else {
        setIsValidSecret(false)
        setLocalError('Invalid secret - does not match commitment')
      }
    } catch (err) {
      setIsValidSecret(false)
      setLocalError('Invalid secret format')
    }
  }, [secret, creatorCommitment])

  const handleReveal = () => {
    if (!isValidSecret) {
      setLocalError('Please enter a valid secret')
      return
    }

    onReveal(secret)
  }

  const handleClose = () => {
    if (!isRevealing) {
      setSecret('')
      setLocalError(null)
      onOpenChange(false)
    }
  }

  // Estimated gas cost (rough estimate)
  const estimatedGasCost = '~$0.10-0.20'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reveal Lottery #{lotteryId.toString()}</DialogTitle>
          <DialogDescription>
            Enter your creator secret to reveal the lottery and assign prizes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action is irreversible and will assign prizes to all committed tickets.
              Make sure you have saved your creator secret before proceeding.
            </AlertDescription>
          </Alert>

          {/* Secret input */}
          <div className="space-y-2">
            <Label htmlFor="secret">Creator Secret</Label>
            <Input
              id="secret"
              type="text"
              placeholder="Enter your creator secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={isRevealing}
              className="font-mono"
            />
            {isValidSecret && (
              <p className="text-sm text-green-600">
                ✓ Secret verified
              </p>
            )}
          </div>

          {/* Gas cost estimate */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Gas Cost:</span>
              <span className="font-medium">{estimatedGasCost}</span>
            </div>
          </div>

          {/* Error display */}
          {(localError || error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {localError || error?.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isRevealing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReveal}
            disabled={!isValidSecret || isRevealing}
          >
            {isRevealing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revealing...
              </>
            ) : (
              'Reveal Lottery'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
