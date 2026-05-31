import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, List, ShieldCheck, Bot, Settings, Plus,
  Lock, ShieldAlert
} from 'lucide-react'
import { useVaultStore } from '@/vault'
import type { Page } from '@/types'

interface NavItemData {
  id: Page
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItemData[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'all-items', label: 'All Items', icon: <List size={16} /> },
  { id: 'security-report', label: 'Security', icon: <ShieldAlert size={16} /> },
  { id: 'ai-assistant', label: 'AI', icon: <Bot size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
]

interface SidebarProps {
  onAddItem: () => void
}

export function Sidebar({ onAddItem }: SidebarProps) {
  const { currentPage, navigate, lock, healthReport } = useVaultStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const totalAlerts = (healthReport?.weakPasswords ?? 0) + (healthReport?.reusedPasswords ?? 0)

  return (
    // Static 56px placeholder — content area never shifts
    <div style={{ width: '56px', flexShrink: 0, position: 'relative', zIndex: 20, height: '100%' }}>
      {/* Overlay expansion panel */}
      <motion.div
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
        animate={{ width: isExpanded ? 160 : 56 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.7 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          background: 'rgba(4, 4, 12, 0.98)',
          borderRight: '1px solid rgba(139, 92, 246, 0.10)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '12px',
          paddingBottom: '12px',
          overflow: 'hidden',
          clipPath: 'inset(0)',       // hard-clips any text that escapes overflow
          zIndex: 20,
          boxShadow: isExpanded ? '6px 0 28px rgba(0,0,0,0.6)' : '2px 0 6px rgba(0,0,0,0.2)',
        }}
      >
        {/* ── Logo ── */}
        <div style={{
          padding: '0 12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflow: 'hidden',
          height: '32px',
          flexShrink: 0,
        }}>
          <div
            style={{
              width: '32px', height: '32px', flexShrink: 0,
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(124,58,237,0.45)',
            }}
          >
            <ShieldCheck size={16} color="white" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                style={{ overflow: 'hidden', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.2px', lineHeight: 1.2, fontFamily: 'Outfit' }}>VaultGuard</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Add Item Button ── */}
        <div style={{ padding: '0 8px', marginBottom: '12px', flexShrink: 0 }}>
          <motion.button
            onClick={onAddItem}
            whileTap={{ scale: 0.96 }}
            title="Add Item"
            style={{
              width: '100%',
              height: '34px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '13px',
              gap: '8px',
              cursor: 'pointer',
              overflow: 'hidden',
              boxShadow: '0 3px 12px rgba(124,58,237,0.35)',
              flexShrink: 0,
            }}
          >
            <Plus size={14} color="white" style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.13 }}
                  style={{
                    fontSize: '12px', fontWeight: '700', color: 'white',
                    whiteSpace: 'nowrap', fontFamily: 'Outfit', overflow: 'hidden',
                  }}
                >
                  Add Item
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          padding: '0 6px',
          overflow: 'hidden',
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = currentPage === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.id)}
                whileTap={{ scale: 0.97 }}
                title={!isExpanded ? item.label : undefined}
                style={{
                  width: '100%',
                  height: '36px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#f3e8ff' : '#94a3b8',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  paddingLeft: '14px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  transition: 'color 0.2s',
                }}
              >
                {/* Active background pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarPill"
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '8px',
                      background: 'rgba(124, 58, 237, 0.14)',
                      border: '1px solid rgba(124, 58, 237, 0.28)',
                      zIndex: -1,
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}

                {/* Icon */}
                <span style={{ color: isActive ? '#a78bfa' : '#64748b', flexShrink: 0, display: 'flex', transition: 'color 0.2s' }}>
                  {item.icon}
                </span>

                {/* Label */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.13 }}
                      style={{
                        fontSize: '12.5px',
                        fontWeight: isActive ? '700' : '500',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        textAlign: 'left',
                        fontFamily: 'Outfit',
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Alert dot */}
                {item.id === 'security-report' && totalAlerts > 0 && (
                  <>
                    {!isExpanded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute', top: '7px', right: '8px',
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: '#f87171',
                        }}
                      />
                    )}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          style={{
                            fontSize: '9px', fontWeight: '900',
                            padding: '1px 5px', borderRadius: '99px',
                            background: 'rgba(239,68,68,0.15)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239,68,68,0.25)',
                            flexShrink: 0,
                          }}
                        >
                          {totalAlerts}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid rgba(139, 92, 246, 0.08)',
          padding: '8px 6px 0',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
        }}>
          {/* Vault status dot */}
          <div style={{
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '10px',
            paddingLeft: '18px',
            overflow: 'hidden',
          }}>
            <span style={{ position: 'relative', width: '7px', height: '7px', flexShrink: 0, display: 'inline-flex' }}>
              <span style={{
                position: 'absolute', display: 'inline-flex', height: '100%', width: '100%',
                borderRadius: '50%', background: '#22c55e', opacity: 0.5,
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
              <span style={{
                position: 'relative', display: 'inline-flex', borderRadius: '50%',
                height: '7px', width: '7px', background: '#22c55e',
              }} />
            </span>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.13 }}
                  style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}
                >
                  Vault Secured
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Lock button */}
          <motion.button
            onClick={lock}
            whileTap={{ scale: 0.97 }}
            title={!isExpanded ? 'Lock Vault' : undefined}
            style={{
              width: '100%',
              height: '34px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              paddingLeft: '15px',
              cursor: 'pointer',
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'color 0.2s, background-color 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.backgroundColor = 'rgba(248,113,113,0.07)'
              el.style.color = '#fca5a5'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.backgroundColor = 'transparent'
              el.style.color = '#64748b'
            }}
          >
            <Lock size={13} style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.13 }}
                  style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', fontFamily: 'Outfit' }}
                >
                  Lock Vault
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
