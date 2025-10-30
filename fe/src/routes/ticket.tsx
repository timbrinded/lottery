import { createFileRoute } from '@tanstack/react-router'

// Define search params type
type TicketSearchParams = {
  lottery?: string
  ticket?: string
  secret?: string
}

export const Route = createFileRoute('/ticket')({
  component: TicketPage,
  validateSearch: (search: Record<string, unknown>): TicketSearchParams => {
    return {
      lottery: search.lottery as string | undefined,
      ticket: search.ticket as string | undefined,
      secret: search.secret as string | undefined,
    }
  },
})

function TicketPage() {
  const { lottery, ticket, secret } = Route.useSearch()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Mystery Lottery Ticket</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        {!lottery || !ticket || !secret ? (
          <div className="text-center py-8">
            <p className="text-red-600 font-semibold mb-2">Invalid Ticket Link</p>
            <p className="text-gray-600">
              This ticket link is missing required information. Please check your link and try again.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Lottery ID</p>
              <p className="font-mono text-lg">{lottery}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Ticket Index</p>
              <p className="font-mono text-lg">{ticket}</p>
            </div>
            <p className="text-gray-600 mt-6">
              Ticket commit and claim functionality will be implemented in tasks 13-15.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
