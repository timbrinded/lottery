/**
 * Example file demonstrating usehooks-ts usage patterns
 * Reference: https://usehooks-ts.com/
 * 
 * This file shows how to use usehooks-ts instead of standard React hooks
 */

import { useLocalStorage, useDebounce, useToggle, useWindowSize } from 'usehooks-ts'

// Example 1: Persistent state with localStorage
export function useWalletPreferences() {
  const [autoConnect, setAutoConnect] = useLocalStorage('wallet-auto-connect', false)
  const [preferredNetwork, setPreferredNetwork] = useLocalStorage('preferred-network', 'arc-mainnet')
  
  return {
    autoConnect,
    setAutoConnect,
    preferredNetwork,
    setPreferredNetwork,
  }
}

// Example 2: Debounced search input
export function useSearchLotteries(searchTerm: string) {
  const debouncedSearch = useDebounce(searchTerm, 500) // 500ms delay
  
  // Use debouncedSearch for API calls instead of searchTerm
  return debouncedSearch
}

// Example 3: Toggle state for modals/menus
export function useModalState() {
  const [isOpen, toggle, setIsOpen] = useToggle(false)
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle,
  }
}

// Example 4: Responsive behavior
export function useIsMobile() {
  const { width } = useWindowSize()
  return width < 768 // Tailwind's md breakpoint
}
