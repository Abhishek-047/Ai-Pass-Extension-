import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, RefreshCw, Globe, CreditCard, FileText, User, Sparkles } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { modalOverlay, modalContent } from '@/animations/variants'
import { generatePassword } from '@/ai'
import { getStrengthColor, getStrengthLabel } from '@/utils/helpers'
import { estimateEntropy } from '@/crypto'
import type { Category, ItemType } from '@/types'

function getPasswordScore(password: string): number {
  if (!password) return 0
  const entropy = estimateEntropy(password)
  let score = Math.min(100, Math.round(entropy * 1.5))
  if (!/[A-Z]/.test(password)) score -= 8
  if (!/[0-9]/.test(password)) score -= 8
  if (!/[^a-zA-Z0-9]/.test(password)) score -= 12
  if (password.length < 8) score -= 25
  return Math.max(0, score)
}

interface AddItemModalProps {
  onClose: () => void
}

type TabType = ItemType

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'login', label: 'Login', icon: <Globe size={13} /> },
  { id: 'card', label: 'Card', icon: <CreditCard size={13} /> },
  { id: 'note', label: 'Secure Note', icon: <FileText size={13} /> },
  { id: 'identity', label: 'Identity', icon: <User size={13} /> },
]

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'social', label: '🌐 Social Media' },
  { value: 'finance', label: '🏦 Finance' },
  { value: 'work', label: '💼 Work' },
  { value: 'email', label: '📧 Email' },
  { value: 'shopping', label: '🛒 Shopping' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'crypto', label: '₿ Crypto' },
  { value: 'other', label: '🔑 Other' },
]

export function AddItemModal({ onClose }: AddItemModalProps) {
  const { addItem } = useVaultStore()
  const [activeTab, setActiveTab] = useState<TabType>('login')
  const [isSaving, setIsSaving] = useState(false)

  // Login fields
  const [loginName, setLoginName] = useState('')
  const [loginWebsite, setLoginWebsite] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginCategory, setLoginCategory] = useState<Category>('other')
  const [loginNotes, setLoginNotes] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Card fields
  const [cardName, setCardName] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // Note fields
  const [noteName, setNoteName] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // Identity fields
  const [idFirst, setIdFirst] = useState('')
  const [idLast, setIdLast] = useState('')
  const [idEmail, setIdEmail] = useState('')
  const [idPhone, setIdPhone] = useState('')
  const [idCompany, setIdCompany] = useState('')

  const passwordScore = getPasswordScore(loginPassword)
  const strengthColor = getStrengthColor(passwordScore)
  const strengthLabel = getStrengthLabel(passwordScore)

  const handleGeneratePassword = () => {
    setIsGenerating(true)
    const context = loginCategory === 'finance' ? 'banking' :
      loginCategory === 'social' ? 'social' :
      loginCategory === 'work' ? 'work' :
      loginCategory === 'email' ? 'email' : 'general'

    const result = generatePassword({
      length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: false, context,
    })
    setLoginPassword(result.password)
    setTimeout(() => setIsGenerating(false), 300)
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      if (activeTab === 'login') {
        if (!loginName || !loginUsername || !loginPassword) return
        await addItem({
          type: 'login',
          name: loginName,
          website: loginWebsite,
          username: loginUsername,
          encryptedPassword: '',
          iv: '',
          category: loginCategory,
          favorite: false,
          tags: [],
          notes: loginNotes,
          rawPassword: loginPassword,
        } as any)
      } else if (activeTab === 'card') {
        if (!cardName || !cardNumber) return
        const [expiryMonth, expiryYear] = cardExpiry.split('/')
        let brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other' = 'other'
        const num = cardNumber.replace(/\s+/g, '')
        if (/^4/.test(num)) brand = 'visa'
        else if (/^5[1-5]/.test(num)) brand = 'mastercard'
        else if (/^3[47]/.test(num)) brand = 'amex'
        else if (/^6(?:011|5)/.test(num)) brand = 'discover'

        await addItem({
          type: 'card',
          name: cardName,
          cardholderName: cardHolder,
          expiryMonth: expiryMonth?.trim() || '',
          expiryYear: expiryYear?.trim() || '',
          brand,
          category: 'finance',
          favorite: false,
          tags: [],
          encryptedNumber: '',
          ivNumber: '',
          encryptedCvv: '',
          ivCvv: '',
          rawNumber: cardNumber,
          rawCvv: cardCvv,
        } as any)
      } else if (activeTab === 'note') {
        if (!noteName || !noteContent) return
        await addItem({
          type: 'note',
          name: noteName,
          category: 'other',
          favorite: false,
          tags: [],
          encryptedContent: '',
          ivContent: '',
          rawContent: noteContent,
        } as any)
      } else if (activeTab === 'identity') {
        if (!idFirst || !idLast) return
        await addItem({
          type: 'identity',
          name: `${idFirst} ${idLast}`,
          firstName: idFirst,
          lastName: idLast,
          email: idEmail,
          phone: idPhone,
          company: idCompany,
          category: 'other',
          favorite: false,
          tags: [],
        } as any)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        variants={modalOverlay}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
        className="modal-backdrop"
      >
        <motion.div
          variants={modalContent}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={e => e.stopPropagation()}
          className="modal-sheet"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#e8e8f8' }}>Add New Item</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: '30px', height: '30px' }}>
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="tab-list" style={{ marginBottom: '20px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Website / App Name *</label>
                <input className="input-field" value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="e.g. Twitter" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Website URL</label>
                <input className="input-field" value={loginWebsite} onChange={e => setLoginWebsite(e.target.value)} placeholder="https://twitter.com" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Email / Username *</label>
                <input className="input-field" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="john@example.com" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter or generate a password"
                    style={{ paddingRight: '80px' }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                    <button type="button" className="btn-icon" onClick={() => setShowPassword(s => !s)} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none' }}>
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <motion.button
                      type="button"
                      className="btn-icon"
                      onClick={handleGeneratePassword}
                      animate={isGenerating ? { rotate: 360 } : {}}
                      transition={{ duration: 0.4 }}
                      style={{ width: '28px', height: '28px', background: 'transparent', border: 'none' }}
                      title="Generate password"
                    >
                      <Sparkles size={13} color="#7c3aed" />
                    </motion.button>
                  </div>
                </div>
                {/* Strength */}
                {loginPassword && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="strength-bar" style={{ flex: 1 }}>
                      <motion.div
                        className="strength-bar-fill"
                        animate={{ width: `${passwordScore}%`, backgroundColor: strengthColor }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColor, fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {strengthLabel}
                    </span>
                    <span style={{ fontSize: '10px', color: '#5a5a7a' }}>✨ AI</span>
                  </motion.div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Category</label>
                <select
                  className="input-field"
                  value={loginCategory}
                  onChange={e => setLoginCategory(e.target.value as Category)}
                  style={{ cursor: 'pointer' }}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Notes (Optional)</label>
                <textarea
                  className="input-field"
                  value={loginNotes}
                  onChange={e => setLoginNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Note Form */}
          {activeTab === 'note' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Note Title *</label>
                <input className="input-field" value={noteName} onChange={e => setNoteName(e.target.value)} placeholder="e.g. WiFi Password" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Content *</label>
                <textarea
                  className="input-field"
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Your secure note content..."
                  rows={5}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Identity Form */}
          {activeTab === 'identity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>First Name *</label>
                  <input className="input-field" value={idFirst} onChange={e => setIdFirst(e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Last Name *</label>
                  <input className="input-field" value={idLast} onChange={e => setIdLast(e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Email</label>
                <input className="input-field" value={idEmail} onChange={e => setIdEmail(e.target.value)} placeholder="john@example.com" type="email" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Phone</label>
                <input className="input-field" value={idPhone} onChange={e => setIdPhone(e.target.value)} placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Company</label>
                <input className="input-field" value={idCompany} onChange={e => setIdCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
            </div>
          )}

          {/* Card Form */}
          {activeTab === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Card Name *</label>
                <input className="input-field" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="e.g. Chase Sapphire" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Cardholder Name</label>
                <input className="input-field" value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="JOHN DOE" />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Card Number</label>
                <input className="input-field" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="•••• •••• •••• ••••" maxLength={19} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>Expiry</label>
                  <input className="input-field" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#7a7a9a', marginBottom: '5px', display: 'block' }}>CVV</label>
                  <input className="input-field" value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="•••" maxLength={4} type="password" />
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#5a5a7a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔐 Card details are encrypted with AES-256 before storage
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <motion.button
              onClick={handleSave}
              className="btn-primary"
              disabled={isSaving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              {isSaving ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} /> Saving...</>
              ) : (
                <><RefreshCw size={13} /> Save Item</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
