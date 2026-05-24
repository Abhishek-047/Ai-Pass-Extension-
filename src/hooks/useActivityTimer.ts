import { useEffect } from 'react'
import { useVaultStore } from '@/vault'

/**
 * Hook to monitor user interactions and refresh the auto-lock countdown timer.
 */
export function useActivityTimer() {
  const { resetAutoLockTimer, isLocked } = useVaultStore()

  useEffect(() => {
    if (isLocked) return

    const handleActivity = () => {
      resetAutoLockTimer()
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [isLocked, resetAutoLockTimer])
}
