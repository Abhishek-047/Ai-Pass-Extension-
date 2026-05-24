import { motion } from 'framer-motion'
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
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'all-items', label: 'All Items', icon: <List size={15} /> },
  { id: 'security-report', label: 'Security', icon: <ShieldAlert size={15} /> },
  { id: 'ai-assistant', label: 'AI Assistant', icon: <Bot size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
]

interface SidebarProps {
  onAddItem: () => void
}

export function Sidebar({ onAddItem }: SidebarProps) {
  const { currentPage, navigate, lock, healthReport } = useVaultStore()

  const totalAlerts = (healthReport?.weakPasswords ?? 0) + (healthReport?.reusedPasswords ?? 0)

  return (
    <div style={{
      width: '160px',
      flexShrink: 0,
      background: 'rgba(5, 5, 12, 0.96)',
      borderRight: '1px solid rgba(139, 92, 246, 0.12)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 10px',
      height: '100%',
      zIndex: 10,
    }}>
      {/* Premium Logo Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px', marginBottom: '22px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '9px',
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(124,58,237,0.4)',
        }}>
          <ShieldCheck size={17} color="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.3px', lineHeight: 1 }}>
            VaultGuard
          </span>
          <span style={{ fontSize: '9px', color: '#6366f1', fontWeight: '800', letterSpacing: '0.5px', marginTop: '1px', textTransform: 'uppercase' }}>
            Enterprise
          </span>
        </div>
      </div>

      {/* Cyber Actions */}
      <motion.button
        className="btn-primary"
        onClick={onAddItem}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '10px 14px',
          fontSize: '13px',
          marginBottom: '18px',
          gap: '8px',
        }}
      >
        <Plus size={15} />
        Add Item
      </motion.button>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' }}>
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="nav-item"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: isActive ? '#f3e8ff' : '#94a3b8',
                zIndex: 1,
              }}
            >
              {/* Sliding dynamic layout indicator pill */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '10px',
                    background: 'rgba(124, 58, 237, 0.12)',
                    border: '1px solid rgba(124, 58, 237, 0.22)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ color: isActive ? '#a78bfa' : '#64748b', transition: 'color 0.2s' }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: isActive ? '700' : '600' }}>
                  {item.label}
                </span>
              </div>

              {item.id === 'security-report' && totalAlerts > 0 && (
                <span className="badge-red" style={{
                  fontSize: '9px',
                  fontWeight: '900',
                  padding: '2px 6px',
                  borderRadius: '99px',
                  lineHeight: 1,
                  zIndex: 2,
                }}>
                  {totalAlerts}
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Footer Area */}
      <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Unlocked status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px' }}>
          <span style={{ display: 'flex', position: 'relative', width: '8px', height: '8px' }}>
            <span style={{
              position: 'absolute',
              display: 'inline-flex',
              height: '100%',
              width: '100%',
              borderRadius: '50%',
              background: '#22c55e',
              opacity: 0.75,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }} />
            <span style={{
              position: 'relative',
              display: 'inline-flex',
              borderRadius: '50%',
              height: '8px',
              width: '8px',
              background: '#22c55e',
            }} />
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', letterSpacing: '0.01em' }}>
            Vault Secured
          </span>
        </div>

        {/* Lock mechanism button */}
        <motion.button
          onClick={lock}
          className="nav-item"
          whileHover={{ x: 2 }}
          style={{
            width: '100%',
            color: '#64748b',
            fontSize: '13px',
            background: 'transparent',
            border: 'none',
          }}
        >
          <Lock size={14} />
          Lock Vault
        </motion.button>
      </div>
    </div>
  )
}
