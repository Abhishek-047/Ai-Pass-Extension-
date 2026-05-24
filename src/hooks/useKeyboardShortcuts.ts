import { useEffect } from 'react'
import { useVaultStore } from '@/vault'

/**
 * Hook to register global keyboard shortcuts for power-users:
 * - Ctrl/Cmd + K: Focus vault search (navigates to All Items first)
 * - Ctrl/Cmd + L: Lock vault immediately
 * - Ctrl/Cmd + N: Go to All Items (ready to add/view)
 */
export function useKeyboardShortcuts() {
  const { lock, navigate, isLocked } = useVaultStore()

  useEffect(() => {
    if (isLocked) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (isMeta && key === 'k') {
        e.preventDefault()
        navigate('all-items')
        // Give page short time to transition
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Search vault..."]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            searchInput.select()
          }
        }, 120)
      } else if (isMeta && key === 'l') {
        e.preventDefault()
        lock()
      } else if (isMeta && key === 'n') {
        e.preventDefault()
        navigate('all-items')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLocked, lock, navigate])
}
