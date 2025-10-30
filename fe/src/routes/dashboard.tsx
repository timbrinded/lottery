import { createFileRoute } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { address, isConnected } = useAccount()

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
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">
            Connected as: <span className="font-mono">{address}</span>
          </p>
          <p className="text-gray-600 mt-4">
            Dashboard functionality will be implemented in task 14.
          </p>
        </div>
      )}
    </div>
  )
}
