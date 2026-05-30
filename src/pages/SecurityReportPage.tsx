import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerItem } from '@/animations/variants'
import { getFaviconUrl, getStrengthColor } from '@/utils/helpers'
import type { LoginItem } from '@/types'

// Larger Security Score Ring with counting animation
function SecurityScoreRingLarge({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = 60
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const dashoffset = circumference - (score / 100) * circumference
  const color = getStrengthColor(score)

  useEffect(() => {
    let start = 0
    const end = score
    if (start === end) {
      setDisplayScore(end)
      return
    }
    const duration = 1200 // ms
    const increment = end > start ? 1 : -1
    const stepTime = Math.abs(Math.floor(duration / end))
    
    const timer = setInterval(() => {
      start += increment
      setDisplayScore(start)
      if (start === end) {
        clearInterval(timer)
      }
    }, Math.max(stepTime, 10))

    return () => clearInterval(timer)
  }, [score])

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        {/* Track */}
        <circle cx={70} cy={70} r={normalizedRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        {/* Progress */}
        <motion.circle
          cx={70} cy={70} r={normalizedRadius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '32px', fontWeight: '900', color, lineHeight: 1, fontFamily: 'Outfit' }}
        >
          {displayScore}%
        </motion.div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: '800', letterSpacing: '0.5px' }}>
          {score >= 80 ? 'EXCELLENT' : score >= 60 ? 'WARNING' : 'CRITICAL'}
        </div>
      </div>
    </div>
  )
}

interface IssueRowProps {
  item: LoginItem
  type: 'weak' | 'reused'
  onSelect: () => void
}

function IssueRow({ item, type, onSelect }: IssueRowProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="vault-item"
      onClick={onSelect}
      whileHover={{ x: 4, background: 'rgba(124,58,237,0.06)' }}
      style={{
        background: 'rgba(255, 255, 255, 0.015)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        marginBottom: '6px',
        padding: '10px 12px'
      }}
    >
      <div className="vault-item-icon" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
        <img
          src={getFaviconUrl(item.website || item.name)}
          alt={item.name}
          width={16}
          height={16}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{ borderRadius: '3px' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
          {item.username}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className={type === 'weak' ? 'badge badge-red' : 'badge badge-amber'} style={{ fontSize: '9px', padding: '2px 6px', fontWeight: '800' }}>
          {type === 'weak' ? 'Weak' : 'Reused'}
        </span>
        <ArrowRight size={13} color="#475569" />
      </div>
    </motion.div>
  )
}

export function SecurityReportPage() {
  const { healthReport, navigate, setSearchQuery } = useVaultStore()

  const score = healthReport?.securityScore ?? 100
  const weakItems = healthReport?.weakItems ?? []
  const reusedItems = healthReport?.reusedItems ?? []
  const totalIssues = weakItems.length + reusedItems.length

  const handleFixItem = (item: LoginItem) => {
    setSearchQuery(item.name)
    navigate('all-items')
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
            Security Report
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Local password health audit report</p>
        </div>
      </motion.div>

      {/* Cyber Overview assessment Card */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        className="glass-card"
        style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
      >
        <SecurityScoreRingLarge score={score} />

        <div style={{ textAlign: 'center', maxWidth: '300px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', fontFamily: 'Outfit' }}>
            {score === 100
              ? 'Your Vault is 100% Secure!'
              : score >= 85
              ? 'Excellent Security Status'
              : score >= 70
              ? 'Moderate Security warning'
              : score >= 50
              ? 'Attention Required'
              : 'Immediate Action Required'}
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px', lineHeight: '1.5', fontWeight: '500' }}>
            {score === 100
              ? 'Outstanding hygiene! All credentials in your vault are cryptographically strong and unique.'
              : `Discovered ${totalIssues} issue${totalIssues > 1 ? 's' : ''} in your database. Resolve them to protect your logins.`}
          </p>
        </div>
      </motion.div>

      {/* Split details panel layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Actionable items checklist */}
        {totalIssues > 0 ? (
          <motion.div
            variants={staggerItem}
            initial="initial"
            animate="animate"
            className="glass-card"
            style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
              <ShieldAlert size={14} color="#f87171" />
              Required Security Actions ({totalIssues})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {weakItems.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#f87171', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>Weak Credentials ({weakItems.length})</div>
                  {weakItems.map(item => (
                    <IssueRow key={`weak-${item.id}`} item={item} type="weak" onSelect={() => handleFixItem(item)} />
                  ))}
                </div>
              )}

              {reusedItems.length > 0 && (
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>Reused Keys ({reusedItems.length})</div>
                  {reusedItems.map(item => (
                    <IssueRow key={`reused-${item.id}`} item={item} type="reused" onSelect={() => handleFixItem(item)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerItem}
            initial="initial"
            animate="animate"
            className="glass-card"
            style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}
          >
            <CheckCircle size={44} color="#4ade80" />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', fontFamily: 'Outfit' }}>Zero Vulnerabilities Detected</h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '300px', lineHeight: '1.5', fontWeight: '500' }}>
              VaultGuard local defense scanner processed all accounts. All keys are highly complex and unique. Great work!
            </p>
          </motion.div>
        )}

        {/* Local Security Advice Panel */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          className="glass-card"
          style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
            <ShieldCheck size={14} color="#c084fc" />
            Enterprise Recommendations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {score < 100 && (
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>1. Rotate Fragile Logins</div>
                <p style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>
                  Tap any weak item to open detail, then use VaultGuard AI generator to create complex passphrases.
                </p>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>{score < 100 ? '2. Eradicate Password Reuse' : '1. Password Isolation Principle'}</div>
              <p style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>
                Reusing passwords increases compromise surface. If one service leaks, hackers easily breach matching accounts.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>{score < 100 ? '3. Combine MFA' : '2. Setup 2FA Alerts'}</div>
              <p style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>
                For high-risk domains (financial portals, email providers), integrate Multi-Factor Authentication alongside robust vault keys.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
