---
inclusion: fileMatch
fileMatchPattern: ["fe/**/*.ts", "fe/**/*.tsx", "fe/**/*.css"]
---

# Frontend Development Rules

## Component Development

### shadcn/ui Integration

- Use `mcp_shadcn` tools to add new components (search, view, get add command)
- Consult shadcn docs for component usage: https://ui.shadcn.com/docs/components
- Follow shadcn patterns for component composition and variants
- Use `cn()` utility from `@/lib/utils` for conditional class merging

### UI Verification

- Use `mcp_playwright` tools to verify visual changes after implementation
- Test responsive behavior across viewport sizes
- Verify interactive states (hover, focus, disabled)

### Placeholder Content

- Label all placeholder/mock data with "Placeholder:" prefix in UI
- Add comments indicating what real implementation should replace
- Example: `<Button>Placeholder: Connect Wallet</Button>`

## State Management

### Zustand for Global State

- Use Zustand stores for cross-component state (not React Context)
- Create feature-specific stores: `useLotteryStore`, `useTicketStore`, `useWalletStore`
- Keep stores minimal - only truly global state belongs here
- Local component state should use React hooks

### React Hooks Usage

- **NEVER use standard React hooks** - use library alternatives instead
- Use hooks from `usehooks-ts` package (TypeScript version of <https://usehooks.com/>):
  - `useLocalStorage` instead of `useState` + `useEffect` for persistence
  - `useDebounce` for debouncing values
  - `useToggle` for boolean state
  - `useOnClickOutside` for click outside detection
  - `useWindowSize` for responsive behavior
  - `useCopyToClipboard` for clipboard operations
  - `useInterval` / `useTimeout` for timers
  - `useMediaQuery` for responsive breakpoints
  - `useEventListener` for DOM event handling
  - See full list at <https://usehooks-ts.com/>
- Use TanStack Router hooks: `useNavigate`, `useParams`, `useSearch`, `useLoaderData`
- Use wagmi hooks: `useAccount`, `useReadContract`, `useWriteContract`, `useWaitForTransactionReceipt`
- For Zustand stores, use the store hooks directly (e.g., `useLotteryStore()`)
- Only use standard React hooks (`useState`, `useEffect`) as a last resort when no library alternative exists

## Routing & Navigation

### TanStack Router Patterns

- Consult TanStack Router docs: https://tanstack.com/router/latest/docs/framework/react/overview
- Use file-based routing in `src/routes/`
- Define route loaders for data fetching
- Use type-safe navigation with `useNavigate({ to: '/path' })`
- Access route params with `useParams()` (fully typed)
- Handle search params with `useSearch()` (validated with Zod)

### Navigation Best Practices

- Use `<Link>` component for internal navigation (not `<a>`)
- Implement loading states during route transitions
- Handle navigation errors with error boundaries

## Code Organization

### Import Order

1. React and framework imports
2. Third-party libraries
3. Internal components (`@/components`)
4. Internal hooks (`@/hooks`)
5. Internal utilities (`@/lib`)
6. Types and interfaces
7. Styles

### Component Structure

```tsx
// 1. Imports
// 2. Types/Interfaces
// 3. Component definition
// 4. Hooks (top of component body)
// 5. Event handlers
// 6. Render logic
// 7. Export
```

## Styling Conventions

- Use Tailwind utility classes exclusively (no custom CSS modules)
- Follow mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Use shadcn/ui design tokens for consistency
- Leverage `class-variance-authority` for component variants

## Web3 Integration

- Use wagmi hooks for all blockchain interactions
- Use viem for utility functions (formatting, parsing)
- Handle wallet connection states explicitly
- Show loading states during transaction confirmation
- Display user-friendly error messages for Web3 errors

## Performance Considerations

- Lazy load routes with TanStack Router's lazy loading
- Use `useDebounce` from usehooks.com for debouncing user input
- Use `useThrottle` from usehooks.com for throttling expensive operations
- Use `useMemoizedFn` or library-specific memoization instead of `useCallback`
- Optimize re-renders by using Zustand selectors properly
