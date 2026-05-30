import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, AlertTriangle, ArrowRight,
  PlusCircle, Sparkles, Zap
} from 'lucide-react'
import { useVaultStore } from '@/vault'
import { getFaviconUrl, timeAgo, getStrengthColor } from '@/utils/helpers'
import type { LoginItem } from '@/types'

// ─── Compact Security Score Ring ─────────────────────────────────────────────
function SecurityScoreRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = 42
  const stroke = 5
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
  const statusText = score >= 80
    ? 'Your vault is in great shape.'
    : score >= 60
    ? 'Some passwords need attention.'
    : 'Immediate action recommended.'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
        <svg width={84} height={84} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          <circle cx={42} cy={42} r={normalizedRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <motion.circle
            cx={42} cy={42} r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color, lineHeight: 1, fontFamily: 'Outfit' }}>
            {displayScore}
          </span>
          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '700' }}>/ 100</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', fontFamily: 'Outfit', letterSpacing: '-0.3px', marginBottom: '4px' }}>
          Security Score
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: `${labelColor}12`, border: `1px solid ${labelColor}28`,
          borderRadius: '6px', padding: '2px 8px', marginBottom: '6px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: labelColor }} />
          <span style={{ fontSize: '10px', fontWeight: '800', color: labelColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        </div>
        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
          {statusText}
        </p>
      </div>
    </div>
  )
}

// ─── Stat Grid Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }: {
  label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div style={{
      background: 'rgba(10, 10, 24, 0.6)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '14px 14px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: '10px', color: '#475569', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '900', color, lineHeight: 1, letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>{sub}</div>}
    </div>
  )
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ label, icon, onClick, accent }: {
  label: string; icon: React.ReactNode; onClick: () => void; accent: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '10px 4px',
        borderRadius: '10px',
        border: `1px solid ${accent}20`,
        background: `${accent}07`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}40`
        ;(e.currentTarget as HTMLButtonElement).style.background = `${accent}12`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}20`
        ;(e.currentTarget as HTMLButtonElement).style.background = `${accent}07`
      }}
    >
      {icon}
      <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

// ─── Vault Item Row ───────────────────────────────────────────────────────────
function VaultItemRow({ item, onClick }: { item: LoginItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '10px',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.06)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.15)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '8px',
        background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <img
          src={getFaviconUrl(item.website || item.name)}
          alt={item.name}
          width={15} height={15}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{ borderRadius: '3px' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
          {item.username}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', color: '#475569' }}>{timeAgo(item.updatedAt)}</span>
        <ArrowRight size={10} color="#475569" />
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
interface DashboardPageProps {
  onAddItem: () => void
}

export function DashboardPage({ onAddItem }: DashboardPageProps) {
  const { items, healthReport, navigate } = useVaultStore()

  const loginItems = items.filter((i): i is LoginItem => i.type === 'login')
  const recentItems = [...loginItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
  const score = healthReport?.securityScore ?? 0
  const totalItems = items.length
  const weakCount = healthReport?.weakPasswords ?? 0
  const reusedCount = healthReport?.reusedPasswords ?? 0

  return (
    <div
      className="scroll-area"
      style={{
        flex: 1,
        padding: '20px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        overflowX: 'hidden',
        overflowY: 'auto',
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.4px', fontFamily: 'Outfit', lineHeight: 1.1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
            {totalItems} items in vault
          </p>
        </div>
      </div>

      {/* ── SECTION 1: Security Score Hero ── */}
      <div
        style={{
          background: 'rgba(10, 10, 24, 0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <SecurityScoreRing score={score} />
        <div style={{ marginTop: '14px' }}>
          <button
            onClick={() => navigate('security-report')}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '9px', borderRadius: '10px', fontSize: '12.5px', gap: '6px' }}
          >
            <ShieldCheck size={13} />
            View Security Report
          </button>
        </div>
      </div>

      {/* ── SECTION 2: Stat Grid (2×2) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <StatCard
          label="Total Items"
          value={totalItems}
          color="#c084fc"
          sub={`${loginItems.length} logins`}
        />
        <StatCard
          label="Weak Passwords"
          value={weakCount}
          color={weakCount > 0 ? '#f87171' : '#4ade80'}
          sub={weakCount > 0 ? 'Need attention' : 'All strong'}
        />
        <StatCard
          label="Reused"
          value={reusedCount}
          color={reusedCount > 0 ? '#fbbf24' : '#4ade80'}
          sub={reusedCount > 0 ? 'Duplicates found' : 'All unique'}
        />
        <StatCard
          label="Security Health"
          value={`${score}%`}
          color={getStrengthColor(score)}
          sub={score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Critical'}
        />
      </div>

      {/* ── SECTION 3: Quick Actions ── */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <QuickAction
            label="Add Item"
            icon={<PlusCircle size={16} color="#c084fc" />}
            onClick={onAddItem}
            accent="#7c3aed"
          />
          <QuickAction
            label="Generate"
            icon={<Sparkles size={16} color="#22d3ee" />}
            onClick={() => navigate('ai-assistant')}
            accent="#06b6d4"
          />
          <QuickAction
            label="Audit"
            icon={<Zap size={16} color="#4ade80" />}
            onClick={() => navigate('security-report')}
            accent="#22c55e"
          />
        </div>
      </div>

      {/* ── SECTION 4: Recent Items ── */}
      <div
        style={{
          background: 'rgba(10, 10, 24, 0.5)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '14px',
          padding: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Recent
          </h2>
          <button
            onClick={() => navigate('all-items')}
            style={{
              fontSize: '11px', color: '#c084fc', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
              fontFamily: 'Outfit', fontWeight: '700',
            }}
          >
            View all <ArrowRight size={10} />
          </button>
        </div>

        {recentItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 12px',
            borderRadius: '10px',
            border: '1px dashed rgba(139,92,246,0.15)',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔐</div>
            <h3 style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '700', fontFamily: 'Outfit', marginBottom: '4px' }}>
              No passwords yet
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>
              Add your first credential to get started
            </p>
            <button
              onClick={onAddItem}
              className="btn-primary"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', gap: '6px' }}
            >
              <PlusCircle size={12} /> Add Item
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {recentItems.map(item => (
              <VaultItemRow key={item.id} item={item} onClick={() => navigate('all-items')} />
            ))}
            {loginItems.length > 3 && (
              <button
                onClick={() => navigate('all-items')}
                style={{
                  marginTop: '6px',
                  padding: '7px',
                  borderRadius: '8px',
                  border: '1px solid rgba(124,58,237,0.15)',
                  background: 'rgba(124,58,237,0.05)',
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Outfit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                +{loginItems.length - 3} more items <ArrowRight size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty vault CTA — only if no items at all */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <AlertTriangle size={12} color="#64748b" style={{ display: 'inline' }} />
          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
            No items in vault — encrypted, zero-knowledge
          </span>
        </div>
      )}
    </div>
  )
}
