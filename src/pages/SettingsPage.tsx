import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, Clipboard, ShieldAlert,
  ToggleLeft, ToggleRight, Trash2, ArrowLeft, Info
} from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerContainer, staggerItem } from '@/animations/variants'

export function SettingsPage() {
  const { settings, updateSettings, wipeEverything, navigate, addToast } = useVaultStore()
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)
  const [wipeConfirmText, setWipeConfirmText] = useState('')

  if (!settings) return null

  const handleUpdate = async (key: keyof typeof settings, value: unknown) => {
    await updateSettings({ [key]: value })
    addToast({ type: 'success', title: 'Settings updated' })
  }

  const handleWipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (wipeConfirmText !== 'RESET') {
      addToast({ type: 'error', title: 'Invalid confirmation text' })
      return
    }
    await wipeEverything()
    addToast({ type: 'warning', title: 'Vault Wiped', description: 'All secure data has been permanently erased.' })
    setShowWipeConfirm(false)
    setWipeConfirmText('')
  }

  return (
    <div className="scroll-area" style={{ flex: 1, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowX: 'hidden', width: '100%', minWidth: 0 }}>
      {/* Header */}
      <motion.div variants={staggerItem} initial="initial" animate="animate" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('dashboard')}
          className="btn-icon"
          style={{ width: '32px', height: '32px' }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={14} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>
            Settings
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>Preferences & database operations</p>
        </div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        {/* Security Options */}
        <motion.div variants={staggerItem} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
            <Lock size={14} color="#c084fc" />
            Security & Timeout
          </h3>

          {/* Auto-Lock timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Auto-Lock Inactivity</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Lock the database after inactivity.</div>
            </div>
            <select
              value={settings.autoLockMinutes}
              onChange={e => handleUpdate('autoLockMinutes', Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: '10px',
                color: '#f1f5f9',
                padding: '6px 12px',
                fontSize: '12.5px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: '700',
              }}
            >
              <option value={1} style={{ background: '#070710' }}>1 Min</option>
              <option value={5} style={{ background: '#070710' }}>5 Mins</option>
              <option value={15} style={{ background: '#070710' }}>15 Mins</option>
              <option value={30} style={{ background: '#070710' }}>30 Mins</option>
              <option value={0} style={{ background: '#070710' }}>Never</option>
            </select>
          </div>

          <div className="divider" />

          {/* Clipboard timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Clear Clipboard</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Wipe copied secrets automatically.</div>
            </div>
            <select
              value={settings.clipboardClearSeconds}
              onChange={e => handleUpdate('clipboardClearSeconds', Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: '10px',
                color: '#f1f5f9',
                padding: '6px 12px',
                fontSize: '12.5px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: '700',
              }}
            >
              <option value={5} style={{ background: '#070710' }}>5 Secs</option>
              <option value={10} style={{ background: '#070710' }}>10 Secs</option>
              <option value={15} style={{ background: '#070710' }}>15 Secs</option>
              <option value={30} style={{ background: '#070710' }}>30 Secs</option>
              <option value={60} style={{ background: '#070710' }}>60 Secs</option>
            </select>
          </div>
        </motion.div>

        {/* Browser Integration Preferences */}
        <motion.div variants={staggerItem} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
            <Clipboard size={14} color="#22d3ee" />
            Integrations & UX
          </h3>

          {/* Autofill enabled toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Autofill Alert Bubble</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Show glass prompt bubble near inputs.</div>
            </div>
            <button
              onClick={() => handleUpdate('autofillEnabled', !settings.autofillEnabled)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              {settings.autofillEnabled ? (
                <ToggleRight size={36} color="#22d3ee" />
              ) : (
                <ToggleLeft size={36} color="#475569" />
              )}
            </button>
          </div>

          <div className="divider" />

          {/* Show strength visualizer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Strength Visualizer</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Analyze password strength on input.</div>
            </div>
            <button
              onClick={() => handleUpdate('showPasswordStrength', !settings.showPasswordStrength)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              {settings.showPasswordStrength ? (
                <ToggleRight size={36} color="#22d3ee" />
              ) : (
                <ToggleLeft size={36} color="#475569" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Danger zone / Reset */}
        <motion.div variants={staggerItem} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
            <ShieldAlert size={14} color="#f87171" />
            Danger Zone
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Destroy Vault Database</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Permanently erase the database, KDF parameters, and keys. This is irreversible.</div>
            </div>
            <button
              onClick={() => setShowWipeConfirm(true)}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px', whiteSpace: 'nowrap', borderRadius: '10px' }}
            >
              <Trash2 size={13} />
              Reset Vault
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Wipe Confirmation Overlay Sheet */}
      <AnimatePresence>
        {showWipeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            style={{ padding: '16px', zIndex: 99999 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-card"
              style={{ background: '#05050f', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '18px', width: '100%', maxWidth: '340px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={16} color="#f87171" />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', fontFamily: 'Outfit' }}>Are you absolutely sure?</h3>
              </div>

              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', fontWeight: '500' }}>
                This action erases your master key verifier and all accounts in IndexedDB. You will lose access to all passwords permanently.
              </p>

              <form onSubmit={handleWipe} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Type <strong style={{ color: '#f87171' }}>RESET</strong> to confirm:</div>
                <input
                  type="text"
                  placeholder="RESET"
                  value={wipeConfirmText}
                  onChange={e => setWipeConfirmText(e.target.value)}
                  className="input-field"
                  style={{ border: '1px solid rgba(239,68,68,0.25)', textTransform: 'uppercase', padding: '10px 14px' }}
                  autoFocus
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowWipeConfirm(false); setWipeConfirmText('') }}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', borderRadius: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-danger"
                    disabled={wipeConfirmText !== 'RESET'}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', opacity: wipeConfirmText === 'RESET' ? 1 : 0.4, borderRadius: '10px' }}
                  >
                    Delete Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info Badge */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#475569' }}>
        <Info size={12} />
        <span style={{ fontSize: '11.5px', fontWeight: '600' }}>VaultGuard v1.1.0 • Enterprise Core</span>
      </div>
    </div>
  )
}
