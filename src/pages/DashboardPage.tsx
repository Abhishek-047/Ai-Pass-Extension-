import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, AlertTriangle, ArrowRight,
  Star, Sparkles, PlusCircle, Clock, Zap
} from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { getFaviconUrl, timeAgo, getStrengthColor } from '@/utils/helpers'
import type { LoginItem } from '@/types'

// ─── Animated Security Score Ring ────────────────────────────────────────────
function SecurityScoreRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = 38
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const dashoffset = circumference - (score / 100) * circumference
  const color = getStrengthColor(score)

  useEffect(() => {
    if (score === 0) { setDisplayScore(0); return }
    let start = 0
    const stepTime = Math.max(Math.floor(1200 / score), 10)
    const timer = setInterval(() => {
      start += 1
      setDisplayScore(start)
      if (start >= score) clearInterval(timer)
    }, stepTime)
    return () => clearInterval(timer)
  }, [score])

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Warning' : 'Critical'
  const labelColor = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
        <svg width={88} height={88} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          <circle cx={44} cy={44} r={normalizedRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <motion.circle
            cx={44} cy={44} r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            style={{ fontSize: '22px', fontWeight: '900', color, lineHeight: 1, fontFamily: 'Outfit' }}
          >
            {displayScore}
          </motion.span>
          <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>%</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f1f5f9', fontFamily: 'Outfit', letterSpacing: '-0.2px', marginBottom: '4px' }}>
          Vault Integrity Score
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: `${labelColor}15`, border: `1px solid ${labelColor}30`,
          borderRadius: '6px', padding: '2px 8px', marginBottom: '6px'
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: labelColor, flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: '800', color: labelColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        </div>
        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
          Based on password strength, reuse & entropy
        </p>
      </div>
    </div>
  )
}

// ─── Stat Mini Card ───────────────────────────────────────────────────────────
function MiniStat({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{
        flex: 1,
        background: 'rgba(12, 12, 26, 0.7)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '14px',
        padding: '14px',
        cursor: 'default',
        transition: 'all 0.3s cubic-bezier(0.25,1,0.5,1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '9px', color: '#475569', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ color, opacity: 0.85 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '900', color, lineHeight: 1, letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: '#475569', marginTop: '5px', fontWeight: '500' }}>{sub}</div>}
    </motion.div>
  )
}

// ─── Vault Item Row ───────────────────────────────────────────────────────────
function VaultItemRow({ item, onClick }: { item: LoginItem; onClick: () => void }) {
  return (
    <motion.div
      variants={staggerItem}
      onClick={onClick}
      whileHover={{ x: 3, backgroundColor: 'rgba(124,58,237,0.06)' }}
      whileTap={{ scale: 0.99 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.2s cubic-bezier(0.25,1,0.5,1)',
        marginBottom: '3px',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '10px',
        background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <img
          src={getFaviconUrl(item.website || item.name)}
          alt={item.name}
          width={18} height={18}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{ borderRadius: '4px' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
          {item.username}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {item.favorite && <Star size={10} color="#fbbf24" fill="#fbbf24" />}
        <span style={{ fontSize: '10px', color: '#475569' }}>{timeAgo(item.updatedAt)}</span>
        <ArrowRight size={11} color="#475569" />
      </div>
    </motion.div>
  )
}

// ─── Skeleton Shimmer ─────────────────────────────────────────────────────────
function Skeleton({ height, radius = 14 }: { height: number; radius?: number }) {
  return (
    <div
      className="shimmer"
      style={{ height, borderRadius: radius, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.08)' }}
    />
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
interface DashboardPageProps {
  onAddItem: () => void
}

export function DashboardPage({ onAddItem }: DashboardPageProps) {
  const { items, healthReport, navigate, settings } = useVaultStore()
  const [isRevealing, setIsRevealing] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setIsRevealing(false), 400)
    return () => clearTimeout(t)
  }, [])

  const loginItems = items.filter((i): i is LoginItem => i.type === 'login')
  const recentItems = [...loginItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
  const score = healthReport?.securityScore ?? 0
  const totalItems = items.length
  const weakCount = healthReport?.weakPasswords ?? 0

  return (
    <div
      className="scroll-area"
      style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowX: 'hidden' }}
    >
      {/* ── Header ── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.5px', fontFamily: 'Outfit', lineHeight: 1.1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
            Your secure password vault
          </p>
        </div>
        {settings?.autoLockMinutes && (
          <motion.div
            className="pulse-border"
            whileHover={{ scale: 1.04 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              background: 'rgba(124,58,237,0.09)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '8px', padding: '5px 10px',
            }}
          >
            <Clock size={11} color="#c084fc" />
            <span style={{ fontSize: '10.5px', color: '#e9d5ff', fontWeight: '700', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
              Auto-lock: {settings.autoLockMinutes}m
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ── Security Score Card ── */}
      {isRevealing ? (
        <Skeleton height={110} />
      ) : (
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          className="glass-card"
          style={{ padding: '18px' }}
        >
          <SecurityScoreRing score={score} />
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('security-report')}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', justifyContent: 'center', gap: '6px' }}
            >
              <ShieldCheck size={13} color="#4ade80" />
              Full Report
            </button>
            <button
              onClick={() => navigate('security-report')}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', justifyContent: 'center', gap: '6px' }}
            >
              <Zap size={13} color="#fbbf24" />
              Fix Issues
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Stat Cards Row ── */}
      {isRevealing ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'flex', gap: '10px' }}
        >
          <MiniStat
            label="Vault Items"
            value={totalItems}
            icon={<ShieldCheck size={13} />}
            color="#c084fc"
            sub={totalItems === 0 ? 'Empty vault' : `${loginItems.length} logins`}
          />
          <MiniStat
            label="Weak Passwords"
            value={healthReport ? weakCount : '—'}
            icon={<AlertTriangle size={13} />}
            color={weakCount > 0 ? '#f87171' : '#4ade80'}
            sub={weakCount > 0 ? 'Needs attention' : healthReport ? 'All strong!' : 'Scanning...'}
          />
        </motion.div>
      )}

      {/* ── Quick Actions ── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'flex', gap: '8px' }}
      >
        {[
          { label: 'Add Item', icon: <PlusCircle size={13} color="#c084fc" />, action: onAddItem, border: 'rgba(124,58,237,0.2)' },
          { label: 'AI Generator', icon: <Sparkles size={13} color="#22d3ee" />, action: () => navigate('ai-assistant'), border: 'rgba(6,182,212,0.2)' },
          { label: 'Security', icon: <ShieldCheck size={13} color="#4ade80" />, action: () => navigate('security-report'), border: 'rgba(34,197,94,0.2)' },
        ].map(({ label, icon, action, border }) => (
          <motion.button
            key={label}
            onClick={action}
            className="btn-secondary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: '12px',
              justifyContent: 'center', fontSize: '11px', gap: '5px',
              border: `1px solid ${border}`, flexDirection: 'column',
              alignItems: 'center', height: '56px',
            }}
          >
            {icon}
            <span style={{ fontWeight: '600', color: '#94a3b8', fontSize: '10.5px' }}>{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        className="glass-card"
        style={{ padding: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.2px', fontFamily: 'Outfit' }}>
            Recent Activity
          </h2>
          <button
            onClick={() => navigate('all-items')}
            style={{
              fontSize: '11.5px', color: '#c084fc', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
              fontFamily: 'Outfit', fontWeight: '700',
            }}
          >
            View all <ArrowRight size={11} />
          </button>
        </div>

        {recentItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ textAlign: 'center', padding: '28px 12px', background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px dashed rgba(139,92,246,0.15)' }}
          >
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '32px', marginBottom: '10px', filter: 'drop-shadow(0 8px 12px rgba(124,58,237,0.25))' }}
            >
              🔐
            </motion.div>
            <h3 style={{ fontSize: '13.5px', color: '#f8fafc', fontWeight: '800', fontFamily: 'Outfit', marginBottom: '5px' }}>
              Vault is Empty
            </h3>
            <p style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
              Add your first encrypted credential to get started
            </p>
            <button
              onClick={onAddItem}
              className="btn-primary glow-pulse"
              style={{ padding: '9px 18px', borderRadius: '100px', fontSize: '12px', gap: '6px' }}
            >
              <PlusCircle size={13} /> Add First Item
            </button>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {recentItems.map(item => (
              <VaultItemRow key={item.id} item={item} onClick={() => navigate('all-items')} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
