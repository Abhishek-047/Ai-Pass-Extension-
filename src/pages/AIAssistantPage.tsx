import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, Sparkles, Copy, RefreshCw, Shield } from 'lucide-react'
import { useVaultStore } from '@/vault'
import { processAIMessage, generatePassword } from '@/ai'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { copyToClipboard } from '@/utils/helpers'
import type { AIMessage, GeneratedPassword } from '@/types'
import { nanoid } from '@/utils/nanoid'

const PRESET_PROMPTS = [
  { label: '🔐 Banking Password', prompt: 'Generate a strong banking password' },
  { label: '🧠 Memorable Strong', prompt: 'Generate a memorable strong password' },
  { label: '📊 Audit Vault Health', prompt: 'Audit my vault health and security score' },
  { label: '💡 Security Tip', prompt: 'Give me a security tip' },
]

function PasswordCard({ generated }: { generated: GeneratedPassword }) {
  const { addToast, settings } = useVaultStore()
  const [copied, setCopied] = useState(false)
  const [newPwd, setNewPwd] = useState(generated)

  const handleRegenerate = () => {
    const result = generatePassword({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: generated.readable, context: 'general' })
    setNewPwd(result)
  }

  const handleCopy = async () => {
    await copyToClipboard(newPwd.password, settings?.clipboardClearSeconds ?? 15)
    setCopied(true)
    addToast({ type: 'success', title: 'Password copied!', description: `Clipboard clears in ${settings?.clipboardClearSeconds ?? 15}s` })
    setTimeout(() => setCopied(false), 2000)
  }

  const strengthColors: Record<string, string> = {
    'very-strong': '#4ade80',
    'strong': '#86efac',
    'fair': '#fbbf24',
    'weak': '#f97316',
    'very-weak': '#f87171',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(124, 58, 237, 0.06)',
        border: '1px solid rgba(124, 58, 237, 0.25)',
        borderRadius: '14px',
        padding: '14px',
        marginTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Sparkles size={13} color="#c084fc" />
        <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: '800', letterSpacing: '0.5px' }}>AI SECURE FIELD</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: strengthColors[newPwd.strength], fontWeight: '800', textTransform: 'uppercase' }}>
          {newPwd.strength.replace('-', ' ')} · {newPwd.score}%
        </span>
      </div>

      <div className="password-display">
        {newPwd.password}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleCopy}
          className="btn-secondary"
          style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px 14px', gap: '6px', borderRadius: '10px' }}
        >
          <Copy size={13} />
          {copied ? '✓ Copied' : 'Copy Password'}
        </button>
        <button
          onClick={handleRegenerate}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', borderRadius: '10px' }}
        >
          <RefreshCw size={13} />
          Regen
        </button>
      </div>
    </motion.div>
  )
}

function ChatMessage({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: '6px',
        width: '100%',
      }}
    >
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', paddingLeft: '4px' }}>
          <div className="glow-pulse" style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}>
            <Bot size={12} color="white" />
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', fontFamily: 'Outfit' }}>VaultGuard AI</span>
          <span style={{ fontSize: '9px', color: '#c084fc', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)', borderRadius: '5px', padding: '1px 5px', fontWeight: '800', textTransform: 'uppercase' }}>local</span>
        </div>
      )}

      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '500' }}>
        {message.content}
      </div>

      {message.generatedPassword && (
        <div style={{ width: '100%', maxWidth: '90%' }}>
          <PasswordCard generated={message.generatedPassword} />
        </div>
      )}
    </motion.div>
  )
}

const WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '👋 Hello! I am your VaultGuard security assistant.\n\nI operate 100% locally in your browser to help you:\n• Generate cryptographically strong passwords\n• Analyze domains for phishing risk\n• Review security guidelines\n\nHow may I help secure your vault today?',
  timestamp: Date.now(),
}

export function AIAssistantPage() {
  const { healthReport, items } = useVaultStore()
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return

    const userMsg: AIMessage = {
      id: nanoid(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsProcessing(true)

    // Sleek processing delay for natural interaction
    await new Promise(r => setTimeout(r, 650 + Math.random() * 350))

    const context = healthReport ? {
      vaultItemCount: items.length,
      weakPasswordCount: healthReport.weakPasswords,
      reusedPasswordCount: healthReport.reusedPasswords,
      securityScore: healthReport.securityScore,
    } : undefined

    const result = processAIMessage(text, context)

    const aiMsg: AIMessage = {
      id: nanoid(),
      role: 'assistant',
      content: result.response,
      timestamp: Date.now(),
      generatedPassword: result.generatedPassword,
    }

    setMessages(prev => [...prev, aiMsg])
    setIsProcessing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', height: '100%', minWidth: 0 }}>
      {/* Header */}
      <div style={{ padding: '18px 16px 0', flexShrink: 0, overflowX: 'hidden' }}>
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}>
              <Bot size={17} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#f1f5f9', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit' }}>
                AI Assistant
                <span className="badge-purple" style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '5px' }}>Copilot</span>
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>On-device processing — no external API calls</p>
            </div>
          </motion.div>

          {/* Privacy Banner */}
          <motion.div
            variants={staggerItem}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '9px', padding: '6px 12px', marginBottom: '14px' }}
          >
            <Shield size={11} color="#4ade80" />
            <span style={{ fontSize: '11px', color: '#86efac', fontWeight: '600' }}>Offline architecture secures password generation.</span>
          </motion.div>

          {/* Preset prompts horizontal row */}
          <motion.div variants={staggerItem} style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }} className="scroll-horizontal">
            {PRESET_PROMPTS.map(p => (
              <button
                key={p.prompt}
                onClick={() => sendMessage(p.prompt)}
                disabled={isProcessing}
                style={{
                  padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontFamily: 'Outfit',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.45)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#c084fc'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.18)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
                }}
              >
                {p.label}
              </button>
            ))}
          </motion.div>

          <div className="divider" style={{ marginTop: '12px' }} />
        </motion.div>
      </div>

      {/* Chat Messages */}
      <div className="scroll-area" style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowX: 'hidden' }}>
        <AnimatePresence>
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={12} color="white" />
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa' }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{ padding: '10px 16px 14px', flexShrink: 0, borderTop: '1px solid rgba(139,92,246,0.08)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            className="input-field"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask AI Copilot..."
            style={{ flex: 1 }}
            disabled={isProcessing}
          />
          <motion.button
            type="submit"
            className="btn-primary"
            disabled={!input.trim() || isProcessing}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '10px 16px', gap: '6px', borderRadius: '12px' }}
          >
            <Send size={14} />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
