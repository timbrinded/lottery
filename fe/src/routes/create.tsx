import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/create')({
  component: CreateLotteryPage,
})

function CreateLotteryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create Mystery Lottery</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Lottery creation form will be implemented in task 12.
        </p>
      </div>
    </div>
  )
}
