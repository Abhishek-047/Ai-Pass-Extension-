import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, ShieldCheck, Fingerprint, AlertCircle } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerContainer, staggerItem, glowPulse } from '@/animations/variants'

export function UnlockPage() {
  const { unlock, isLoading, failedUnlockAttempts, lockoutUntil } = useVaultStore()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  
  // Local state to track remaining lockout time dynamically
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    if (!lockoutUntil) {
      setSecondsRemaining(0)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
      setSecondsRemaining(remaining)
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)
    return () => clearInterval(timerId)
  }, [lockoutUntil])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || isUnlocking || secondsRemaining > 0) return

    setIsUnlocking(true)
    setError('')

    const success = await unlock(password)

    if (!success) {
      setShaking(true)
      // Check if store lockout got triggered
      if (failedUnlockAttempts >= 4) {
        setError('Maximum failed attempts. Vault locked.')
      } else {
        setError('Incorrect master password. Please try again.')
      }
      setTimeout(() => setShaking(false), 600)
    }

    setIsUnlocking(false)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#030307' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 30, height: 30, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%' }}
        />
      </div>
    )
  }

  const isLockedOut = secondsRemaining > 0

  return (
    <div className="gradient-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(24px)' }} />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
      >
        {/* Startup Sleek Logo Display */}
        <motion.div variants={staggerItem} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <motion.div
            variants={glowPulse}
            animate="animate"
            style={{
              width: '76px', height: '76px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 36px rgba(124,58,237,0.4)',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <ShieldCheck size={38} color="white" />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                position: 'absolute', inset: '-10px',
                border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: '30px',
              }}
            />
          </motion.div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-0.6px', fontFamily: 'Outfit' }}>
              VaultGuard
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', letterSpacing: '0.3px', textTransform: 'uppercase', marginTop: '4px' }}>
              Cybersecurity Vault
            </p>
          </div>
        </motion.div>

        {/* Security Unlock Form Card */}
        <motion.div
          variants={staggerItem}
          className="glass-card"
          style={{ width: '100%', padding: '24px 22px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
            <Lock size={14} color="#a78bfa" />
            <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vault Secured
            </span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', marginBottom: '16px', fontFamily: 'Outfit', letterSpacing: '-0.3px' }}>
            Unlock Database
          </h2>

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Password entry */}
            <motion.div
              animate={shaking ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              style={{ position: 'relative' }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLockedOut ? `Locked out (wait ${secondsRemaining}s)` : 'Master Password'}
                className="input-field"
                autoFocus={!isLockedOut}
                disabled={isLockedOut}
                style={{
                  paddingRight: '46px',
                  background: isLockedOut ? 'rgba(239, 68, 68, 0.03)' : '',
                  borderColor: isLockedOut ? 'rgba(239, 68, 68, 0.3)' : '',
                }}
              />
              {!isLockedOut && (
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="btn-icon"
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', background: 'transparent', border: 'none' }}
                >
                  {showPassword ? <EyeOff size={14} color="#64748b" /> : <Eye size={14} color="#64748b" />}
                </button>
              )}
            </motion.div>

            {/* Error notifications / lockout counter details */}
            {isLockedOut ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: '600' }}>
                  Wait {secondsRemaining} seconds before retry.
                </span>
              </motion.div>
            ) : error ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
              >
                ⚠ {error}
              </motion.p>
            ) : failedUnlockAttempts > 0 ? (
              <p style={{ fontSize: '11px', color: '#eab308', fontWeight: '600' }}>
                ⚠ Attempt {failedUnlockAttempts} of 5 before temporary lock.
              </p>
            ) : null}

            <motion.button
              type="submit"
              className="btn-primary"
              disabled={!password || isUnlocking || isLockedOut}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', marginTop: '4px' }}
            >
              {isUnlocking ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', marginRight: '8px' }}
                  />
                  Decrypting...
                </>
              ) : (
                <>
                  <Lock size={14} style={{ marginRight: '4px' }} />
                  Unlock Database
                </>
              )}
            </motion.button>
          </form>

          {/* Fingerprint indicator sheet */}
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Fingerprint size={16} color="#475569" />
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Biometric Unlock (TouchID ready)</span>
          </div>
        </motion.div>

        {/* Cybernote footer */}
        <motion.p variants={staggerItem} style={{ fontSize: '11px', color: '#475569', textAlign: 'center', fontWeight: '500', letterSpacing: '0.2px' }}>
          🛡️ Local AES-256-GCM • Zero-Knowledge Architecture
        </motion.p>
      </motion.div>
    </div>
  )
}
