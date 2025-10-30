import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lottery/$id')({
  component: LotteryDetailsPage,
})

function LotteryDetailsPage() {
  const { id } = Route.useParams()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Lottery Details</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Lottery ID</p>
          <p className="font-mono text-lg">{id}</p>
        </div>
        <p className="text-gray-600 mt-6">
          Lottery details page will be fully implemented in later tasks.
        </p>
      </div>
    </div>
  )
}
