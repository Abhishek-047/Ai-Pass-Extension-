import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Check } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerContainer, staggerItem, glowPulse } from '@/animations/variants'
import { estimateEntropy } from '@/crypto'
import { getStrengthColor, getStrengthLabel } from '@/utils/helpers'

const requirements = [
  { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
  { label: 'Uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character (!@#...)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
]

function getPasswordScore(password: string): number {
  if (!password) return 0
  const entropy = estimateEntropy(password)
  let score = Math.min(100, Math.round(entropy * 1.5))
  if (!/[A-Z]/.test(password)) score -= 10
  if (!/[0-9]/.test(password)) score -= 10
  if (!/[^a-zA-Z0-9]/.test(password)) score -= 15
  if (password.length < 8) score -= 30
  return Math.max(0, score)
}



export function SetupPage() {
  const { setupMasterPassword } = useVaultStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const score = getPasswordScore(password)
  const strengthColor = getStrengthColor(score)
  const strengthLabel = getStrengthLabel(score)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || isCreating) return

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (score < 40) {
      setError('Please use a stronger master password')
      return
    }

    setIsCreating(true)
    setError('')
    await setupMasterPassword(password)
    setIsCreating(false)
  }

  return (
    <div className="gradient-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', overflowY: 'auto', overflowX: 'hidden' }}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Logo and Welcome header */}
        <motion.div variants={staggerItem} style={{ textAlign: 'center' }}>
          <motion.div
            variants={glowPulse}
            animate="animate"
            style={{ 
              width: '64px', height: '64px', 
              borderRadius: '18px', 
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 14px', 
              boxShadow: '0 6px 20px rgba(124,58,237,0.3)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <ShieldCheck size={32} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>
            Initialize Vault
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', lineHeight: '1.5', fontWeight: '500' }}>
            Your master password derives the vault key locally.<br />
            <strong style={{ color: '#f87171', fontWeight: '700' }}>It is never stored online and cannot be reset.</strong>
          </p>
        </motion.div>

        {/* Create Form */}
        <motion.div variants={staggerItem} className="glass-card" style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Master password input */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Master Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Master password"
                  className="input-field"
                  style={{ paddingRight: '44px' }}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Segmented Strength Bar */}
              {password && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '10px' }}>
                  <div className="strength-bar" style={{ marginBottom: '6px', display: 'flex', gap: '3px', background: 'transparent' }}>
                    {[1, 2, 3, 4, 5].map((segmentIndex) => {
                      const segmentActive = score >= segmentIndex * 20
                      return (
                        <div
                          key={segmentIndex}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: segmentActive ? strengthColor : 'rgba(255,255,255,0.06)',
                            boxShadow: segmentActive ? `0 0 8px ${strengthColor}80` : '',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      )
                    })}
                  </div>
                  <span style={{ fontSize: '11px', color: strengthColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {strengthLabel}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Confirm password input */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="input-field"
                style={{
                  borderColor: confirm && password !== confirm ? 'rgba(239,68,68,0.4)' : '',
                  boxShadow: confirm && password !== confirm ? '0 0 0 3px rgba(239,68,68,0.1)' : '',
                }}
              />
            </div>

            {/* Requirements check list */}
            {password && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                {requirements.map(req => {
                  const met = req.test(password)
                  return (
                    <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: met ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${met ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}>
                        {met && <Check size={8} color="#22c55e" strokeWidth={4} />}
                      </div>
                      <span style={{ fontSize: '11.5px', color: met ? '#86efac' : '#475569', fontWeight: met ? '600' : '500' }}>
                        {req.label}
                      </span>
                    </div>
                  )
                })}
              </motion.div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <AlertTriangle size={13} /> {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              className="btn-primary"
              disabled={!password || !confirm || isCreating || password !== confirm}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: '6px' }}
            >
              {isCreating ? 'Deriving Keys...' : '🔐 Create Vault'}
            </motion.button>
          </form>
        </motion.div>

        {/* Absolute Security Warning Banner */}
        <motion.div
          variants={staggerItem}
          style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}
        >
          <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '11.5px', color: '#d97706', lineHeight: '1.6', fontWeight: '500' }}>
            VaultGuard uses <strong style={{ color: '#fbbf24' }}>zero-knowledge</strong> principles. Your password never leaves this browser. We cannot restore it if forgotten.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
