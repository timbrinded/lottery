import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/participant/lottery/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/participant/lottery/$id"!</div>
}
