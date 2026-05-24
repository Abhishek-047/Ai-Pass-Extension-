import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { toastVariants } from '@/animations/variants'

const ICONS = {
  success: <CheckCircle size={15} color="#4ade80" />,
  error: <XCircle size={15} color="#f87171" />,
  warning: <AlertTriangle size={15} color="#fbbf24" />,
  info: <Info size={15} color="#60a5fa" />,
}

const COLORS = {
  success: { border: 'rgba(74, 222, 128, 0.22)', bg: 'rgba(6, 18, 12, 0.9)', bar: '#4ade80' },
  error: { border: 'rgba(248, 113, 113, 0.22)', bg: 'rgba(24, 7, 7, 0.9)', bar: '#f87171' },
  warning: { border: 'rgba(251, 191, 36, 0.22)', bg: 'rgba(24, 18, 6, 0.9)', bar: '#fbbf24' },
  info: { border: 'rgba(96, 165, 250, 0.22)', bg: 'rgba(6, 12, 24, 0.9)', bar: '#60a5fa' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useVaultStore()

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 99999,
      pointerEvents: 'none', // Allow clicks behind gaps
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              pointerEvents: 'auto', // Enable interaction for toast itself
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: `linear-gradient(135deg, ${COLORS[toast.type].bg}, rgba(8, 8, 16, 0.95))`,
              border: `1px solid ${COLORS[toast.type].border}`,
              borderRadius: '12px',
              padding: '12px 14px 14px 14px',
              minWidth: '240px',
              maxWidth: '320px',
              backdropFilter: 'blur(28px) saturate(200%)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Type Icon */}
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {ICONS[toast.type]}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', lineHeight: '1.3' }}>
                {toast.title}
              </p>
              {toast.description && (
                <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                  {toast.description}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
            >
              <X size={13} />
            </button>

            {/* Animated countdown progress bar overlay */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '2.5px',
                background: COLORS[toast.type].bar,
                boxShadow: `0 0 6px ${COLORS[toast.type].bar}80`,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
