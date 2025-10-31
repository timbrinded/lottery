import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ticket')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/ticket"!</div>
}
