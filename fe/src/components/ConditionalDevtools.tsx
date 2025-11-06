import { Suspense, lazy, type ComponentType } from 'react'

let DevtoolsPanel: ComponentType | null = null

if (import.meta.env.DEV) {
  DevtoolsPanel = lazy(async () => {
    const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] = await Promise.all([
      import('@tanstack/react-devtools'),
      import('@tanstack/react-router-devtools'),
    ])

    return {
      default: () => (
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      ),
    }
  })
}

export function ConditionalDevtools() {
  if (!DevtoolsPanel) {
    return null
  }

  const Panel = DevtoolsPanel

  return (
    <Suspense fallback={null}>
      <Panel />
    </Suspense>
  )
}
