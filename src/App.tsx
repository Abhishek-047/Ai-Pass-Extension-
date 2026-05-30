import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVaultStore } from '@/vault'
import { Sidebar } from '@/components/Sidebar'
import { ToastContainer } from '@/components/ToastContainer'
import { AddItemModal } from '@/components/AddItemModal'
import { SetupPage } from '@/pages/SetupPage'
import { UnlockPage } from '@/pages/UnlockPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AllItemsPage } from '@/pages/AllItemsPage'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { SecurityReportPage } from '@/pages/SecurityReportPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { useKeyboardShortcuts, useActivityTimer } from '@/hooks'

function App() {
  const { isSetup, isLocked, isLoading, currentPage, initialize } = useVaultStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // Register global hooks
  useKeyboardShortcuts()
  useActivityTimer()

  // Initialize vault state
  useEffect(() => {
    initialize()
  }, [initialize])

  // Show a loading screen on start
  if (isLoading) {
    return (
      <div className="gradient-bg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32,
            height: 32,
            border: '3px solid #7c3aed',
            borderTopColor: 'transparent',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  // Routing before vault is setup
  if (!isSetup) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <SetupPage />
        <ToastContainer />
      </div>
    )
  }

  // Routing when vault is locked
  if (isLocked) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <UnlockPage />
        <ToastContainer />
      </div>
    )
  }

  // Main layout when vault is unlocked
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onAddItem={() => setShowAddModal(true)} />
      case 'all-items':
        return <AllItemsPage />
      case 'ai-assistant':
        return <AIAssistantPage />
      case 'security-report':
        return <SecurityReportPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage onAddItem={() => setShowAddModal(true)} />
    }
  }

  return (
    <div className="gradient-bg" style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      
      {/* Cinematic Grain/Noise Overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.025,
          zIndex: 50,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Left Sidebar */}
      <Sidebar onAddItem={() => setShowAddModal(true)} />

      {/* Main Workspace content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -10, filter: 'blur(2px)' }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1], delay: 0.05 }}
            style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Add Item Overlay Sheet */}
      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Global Notifications Container */}
      <ToastContainer />
    </div>
  )
}

export default App
