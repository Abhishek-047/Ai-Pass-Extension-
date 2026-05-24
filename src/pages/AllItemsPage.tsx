import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Star, Copy, Eye, EyeOff, Trash2, Globe,
  CreditCard, FileText, User, ChevronRight, Edit2, Check
} from 'lucide-react'
import { useVaultStore } from '@/vault'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { getFaviconUrl, copyToClipboard, timeAgo, getCategoryIcon } from '@/utils/helpers'
import type { LoginItem, VaultItem } from '@/types'

const CATEGORY_FILTERS = [
  { value: null, label: 'All' },
  { value: 'social', label: 'Social' },
  { value: 'finance', label: 'Finance' },
  { value: 'work', label: 'Work' },
  { value: 'email', label: 'Email' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]

function ItemTypeIcon({ type }: { type: VaultItem['type'] }) {
  const icons = {
    login: <Globe size={15} color="#a78bfa" />,
    card: <CreditCard size={15} color="#67e8f9" />,
    note: <FileText size={15} color="#86efac" />,
    identity: <User size={15} color="#fbbf24" />,
  }
  return icons[type]
}

function ItemDetail({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const { getDecryptedPassword, deleteItem, toggleFavorite, updateItem, settings, addToast } = useVaultStore()
  const [revealed, setRevealed] = useState(false)
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editUsername, setEditUsername] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editNotes, setEditNotes] = useState(item.notes || '')

  useEffect(() => {
    // Reset view states when item changes
    setRevealed(false)
    setPassword('')
    setIsDeleting(false)
    setIsEditing(false)
    setEditName(item.name)
    setEditNotes(item.notes || '')

    if (item.type === 'login') {
      const login = item as LoginItem
      setEditUsername(login.username)
      setEditWebsite(login.website || '')
      getDecryptedPassword(login).then(setPassword).catch(() => {})
    }
  }, [item])

  const handleReveal = async () => {
    if (item.type !== 'login') return
    if (!revealed && !password) {
      const pwd = await getDecryptedPassword(item as LoginItem)
      setPassword(pwd)
    }
    setRevealed(r => !r)
  }

  const handleCopyPassword = async () => {
    if (item.type !== 'login') return
    const pwd = password || await getDecryptedPassword(item as LoginItem)
    await copyToClipboard(pwd, settings?.clipboardClearSeconds ?? 15)
    setCopied('password')
    addToast({ type: 'success', title: 'Copied Password!', description: `Clipboard clears in ${settings?.clipboardClearSeconds ?? 15}s` })
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyUsername = async () => {
    if (item.type !== 'login') return
    await copyToClipboard((item as LoginItem).username)
    setCopied('username')
    addToast({ type: 'success', title: 'Username copied!' })
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = async () => {
    if (!isDeleting) { setIsDeleting(true); return }
    await deleteItem(item.id)
    onClose()
  }

  const handleSaveEdit = async () => {
    const updates: Partial<VaultItem> = {
      name: editName,
      notes: editNotes,
    }
    if (item.type === 'login') {
      // Re-encrypt password if changed
      // For simplicity in this layout, we update metadata and fields
      Object.assign(updates, {
        username: editUsername,
        website: editWebsite,
      })
    }
    await updateItem(item.id, updates)
    setIsEditing(false)
    addToast({ type: 'success', title: 'Item updated successfully' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="glass-card scroll-area"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="vault-item-icon" style={{ width: '44px', height: '44px' }}>
          {item.type === 'login' ? (
            <img src={getFaviconUrl((item as LoginItem).website || item.name)} alt={item.name} width={22} height={22} style={{ borderRadius: '4px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : <ItemTypeIcon type={item.type} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input-field"
              style={{ padding: '6px 10px', fontSize: '14px', fontWeight: '700' }}
            />
          ) : (
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Outfit' }}>{item.name}</h3>
          )}
          {item.type === 'login' && <p style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{(item as LoginItem).website}</p>}
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => toggleFavorite(item.id)} className="btn-icon" style={{ width: '28px', height: '28px' }} title="Toggle favorite">
            <Star size={13} color={item.favorite ? '#fbbf24' : '#64748b'} fill={item.favorite ? '#fbbf24' : 'none'} />
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className="btn-icon" style={{ width: '28px', height: '28px' }} title="Edit record">
            <Edit2 size={13} color={isEditing ? '#c084fc' : '#64748b'} />
          </button>
          <button onClick={onClose} className="btn-icon" style={{ width: '28px', height: '28px' }}>✕</button>
        </div>
      </div>

      <div className="divider" />

      {/* Editing / Fields Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {item.type === 'login' && (
          <>
            {/* Username Field */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Username / Email</div>
              {isEditing ? (
                <input
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', color: '#e2e8f0', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(item as LoginItem).username}</span>
                  <button onClick={handleCopyUsername} className="btn-icon" style={{ width: '26px', height: '26px', flexShrink: 0 }}>
                    {copied === 'username' ? <span style={{ fontSize: '11px', color: '#4ade80' }}>✓</span> : <Copy size={11} />}
                  </button>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#c084fc', fontFamily: 'JetBrains Mono, monospace', letterSpacing: revealed ? '0.5px' : '2px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {revealed ? password : '••••••••••••••'}
                </span>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={handleReveal} className="btn-icon" style={{ width: '26px', height: '26px' }}>
                    {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  <button onClick={handleCopyPassword} className="btn-icon" style={{ width: '26px', height: '26px' }}>
                    {copied === 'password' ? <span style={{ fontSize: '11px', color: '#4ade80' }}>✓</span> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Website Field (Edit mode only) */}
            {isEditing && (
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Website Url</div>
                <input
                  value={editWebsite}
                  onChange={e => setEditWebsite(e.target.value)}
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                />
              </div>
            )}
          </>
        )}

        {/* Card Fields */}
        {item.type === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px' }}>CARDHOLDER NAME</div>
              <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{(item as any).cardholderName}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px' }}>CARD NUMBER</div>
              <span style={{ fontSize: '13.5px', color: '#e2e8f0', fontFamily: 'JetBrains Mono', letterSpacing: '1px' }}>•••• •••• •••• ••••</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px' }}>EXPIRY DATE</div>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{(item as any).expiryMonth}/{(item as any).expiryYear}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px' }}>CVV</div>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>•••</span>
              </div>
            </div>
          </div>
        )}

        {/* Identity Details */}
        {item.type === 'identity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['FIRST NAME', (item as any).firstName],
              ['LAST NAME', (item as any).lastName],
              ['EMAIL ADDRESS', (item as any).email],
              ['PHONE NUMBER', (item as any).phone],
              ['COMPANY', (item as any).company],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '10px 14px' }}>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px' }}>{label}</div>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes Textarea / Input */}
        <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notes / Comments</div>
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="input-field"
              rows={3}
              style={{ fontSize: '12.5px', resize: 'none' }}
            />
          ) : (
            <p style={{ fontSize: '12.5px', color: item.notes ? '#94a3b8' : '#475569', lineHeight: '1.5' }}>
              {item.notes || 'No secure notes configured.'}
            </p>
          )}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Updated {timeAgo(item.updatedAt)} · {getCategoryIcon(item.category)} {item.category}
      </div>

      {/* Dynamic Save / Delete Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isEditing ? (
          <button
            onClick={handleSaveEdit}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px' }}
          >
            <Check size={14} />
            Save Upgraded Details
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className="btn-danger"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px' }}
          >
            <Trash2 size={13} />
            {isDeleting ? 'Press again to confirm permanent wipe' : 'Delete Item'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function AllItemsPage() {
  const { items, searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useVaultStore()
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null)
  
  // Set default category
  useEffect(() => {
    setActiveCategory(null)
  }, [])

  const filtered = items.filter(item => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.type === 'login' && (
        (item as LoginItem).username.toLowerCase().includes(q) ||
        (item as LoginItem).website?.toLowerCase().includes(q)
      ))
    const matchesCategory = !activeCategory || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const favorites = filtered.filter(i => i.favorite)
  const rest = filtered.filter(i => !i.favorite)

  return (
    <div style={{ flex: 1, display: 'flex', gap: '0', overflow: 'hidden', width: '100%', height: '100%' }}>
      {/* List Panel (240px when detail panel opens) */}
      <div style={{
        flex: selectedItem ? '0 0 210px' : '1',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        gap: '14px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        borderRight: selectedItem ? '1px solid rgba(139,92,246,0.08)' : 'none'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>
            All Items
          </h1>
          <span className="badge-purple" style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
            {filtered.length}
          </span>
        </div>

        {/* Dynamic Category Scrolling Row */}
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }} className="scroll-horizontal">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={String(f.value)}
              onClick={() => setActiveCategory(f.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                border: '1px solid',
                borderColor: activeCategory === f.value ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
                background: activeCategory === f.value ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                color: activeCategory === f.value ? '#c084fc' : '#64748b',
                cursor: 'pointer',
                fontFamily: 'Outfit',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Modern Search */}
        <div className="search-wrapper">
          <Search size={13} className="search-icon" />
          <input
            className="input-field"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Scrollable list */}
        <div className="scroll-area" style={{ flex: 1 }}>
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '40px 16px', marginTop: '20px', background: 'rgba(0,0,0,0.1)', borderRadius: '14px', border: '1px dashed rgba(139,92,246,0.15)' }}
            >
              <motion.div 
                animate={{ y: [-3, 3, -3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '38px', marginBottom: '14px', filter: 'drop-shadow(0 10px 15px rgba(124,58,237,0.2))' }}
              >
                {searchQuery ? '🔎' : '🗂️'}
              </motion.div>
              <h3 style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '800', fontFamily: 'Outfit', marginBottom: '6px' }}>
                {searchQuery ? 'No Matches' : 'Category Empty'}
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                {searchQuery ? `No records found for "${searchQuery}"` : 'This section of your vault is currently empty.'}
              </p>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {favorites.length > 0 && (
                <>
                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '0.08em', padding: '4px 8px', textTransform: 'uppercase' }}>Favorites</div>
                  {favorites.map(item => (
                    <ItemRow key={item.id} item={item} selected={selectedItem?.id === item.id} onClick={() => setSelectedItem(item)} compact={!!selectedItem} />
                  ))}
                  <div style={{ margin: '6px 0' }} className="divider" />
                </>
              )}
              {rest.length > 0 && (
                <>
                  {favorites.length > 0 && <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '0.08em', padding: '4px 8px', textTransform: 'uppercase' }}>All Records</div>}
                  {rest.map(item => (
                    <ItemRow key={item.id} item={item} selected={selectedItem?.id === item.id} onClick={() => setSelectedItem(item)} compact={!!selectedItem} />
                  ))}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Dynamic Detail Panel */}
      <AnimatePresence>
        {selectedItem && (
          <div style={{ flex: 1, padding: '20px 20px 20px 0', overflow: 'hidden' }}>
            <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ItemRow({ item, selected, onClick, compact }: { item: VaultItem; selected: boolean; onClick: () => void; compact: boolean }) {
  return (
    <motion.div
      variants={staggerItem}
      className="vault-item"
      onClick={onClick}
      style={{
        background: selected ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.01)',
        borderColor: selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        borderStyle: 'solid',
        borderWidth: '1px',
        padding: compact ? '10px 12px' : '12px 14px',
      }}
      whileHover={{ x: 2, background: 'rgba(124, 58, 237, 0.06)' }}
    >
      <div className="vault-item-icon" style={{ width: compact ? '32px' : '38px', height: compact ? '32px' : '38px', borderRadius: '8px' }}>
        {item.type === 'login' ? (
          <img src={getFaviconUrl((item as LoginItem).website || item.name)} alt={item.name} width={compact ? 15 : 18} height={compact ? 15 : 18} style={{ borderRadius: '3px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : <ItemTypeIcon type={item.type} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        {!compact && item.type === 'login' && (
          <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{(item as LoginItem).username}</div>
        )}
      </div>
      {item.favorite && <Star size={11} color="#fbbf24" fill="#fbbf24" style={{ flexShrink: 0 }} />}
      <ChevronRight size={13} color="#475569" style={{ flexShrink: 0 }} />
    </motion.div>
  )
}
