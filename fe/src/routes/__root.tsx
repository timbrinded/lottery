import { Outlet, createRootRoute } from '@tanstack/react-router'

import Header from '../components/Header'
import { ErrorBoundary } from '../components/ErrorBoundary'
// import { ConditionalDevtools } from '../components/ConditionalDevtools'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Header />
      <Outlet />
    </ErrorBoundary>
  ),
})
