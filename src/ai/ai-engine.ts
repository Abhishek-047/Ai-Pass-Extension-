/**
 * VaultGuard Local AI Engine
 * 
 * ALL AI logic runs locally — NO passwords or secrets sent to any API.
 * AI only receives: context labels, domain names, metadata.
 * 
 * Features:
 * - Smart password generation (context-aware)
 * - Password strength explanation
 * - Phishing/suspicious domain detection
 * - Vault health recommendations
 * - Security tips
 */

import type {
  GeneratedPassword, PasswordGeneratorConfig, DomainRiskResult, PasswordAnalysis
} from '@/types'
import { estimateEntropy } from '@/crypto'

// ─────────────────────────────────────────────
// Password Generator
// ─────────────────────────────────────────────

const WORD_LISTS = {
  adjectives: ['Crimson', 'Silver', 'Cosmic', 'Neon', 'Arctic', 'Shadow', 'Storm', 'Jade', 'Steel', 'Amber', 'Onyx', 'Cobalt', 'Violet', 'Lunar', 'Swift'],
  nouns: ['Tiger', 'Phoenix', 'Orbit', 'Cipher', 'Ridge', 'Nexus', 'Falcon', 'Forge', 'Pulse', 'Vortex', 'Prism', 'Knight', 'Spark', 'Raven', 'Atlas'],
  symbols: ['!', '@', '#', '$', '%', '&', '*', '?'],
}

function getContextConfig(context: PasswordGeneratorConfig['context']): Partial<PasswordGeneratorConfig> {
  switch (context) {
    case 'banking':
      return { length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: false }
    case 'social':
      return { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: true }
    case 'work':
      return { length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: false }
    case 'email':
      return { length: 18, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: false }
    default:
      return { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: false }
  }
}

function generateRandomPassword(config: PasswordGeneratorConfig): string {
  let charset = ''
  if (config.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz'
  if (config.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (config.numbers) charset += '0123456789'
  if (config.symbols) charset += '!@#$%^&*?'

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz'

  const bytes = crypto.getRandomValues(new Uint8Array(config.length))
  return Array.from(bytes, b => charset[b % charset.length]).join('')
}

function generateMemorablePassword(length: number): string {
  const { adjectives, nouns, symbols } = WORD_LISTS
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const sym = symbols[Math.floor(Math.random() * symbols.length)]
  const num = Math.floor(Math.random() * 90) + 10

  let password = `${adj}${sym}${noun}${num}`
  if (password.length < length) {
    const extra = generateRandomPassword({ length: length - password.length, uppercase: false, lowercase: true, numbers: true, symbols: false, memorable: false })
    password += extra
  }
  return password
}

export function generatePassword(config: PasswordGeneratorConfig): GeneratedPassword {
  const finalConfig = { ...getContextConfig(config.context), ...config }

  const password = finalConfig.memorable
    ? generateMemorablePassword(finalConfig.length ?? 20)
    : generateRandomPassword(finalConfig as PasswordGeneratorConfig)

  const entropy = estimateEntropy(password)
  const score = Math.min(100, Math.round(entropy * 1.5))
  const strength =
    score >= 80 ? 'very-strong' :
    score >= 60 ? 'strong' :
    score >= 40 ? 'fair' :
    score >= 20 ? 'weak' : 'very-weak'

  const explanation = finalConfig.memorable
    ? `Memorable passphrase: easy to recall, highly secure. ${Math.round(entropy)} bits of entropy.`
    : `Random password with ${Math.round(entropy)} bits of entropy — virtually uncrackable.`

  return { password, strength, score, readable: finalConfig.memorable ?? false, explanation }
}

// ─────────────────────────────────────────────
// Password Strength Explainer
// ─────────────────────────────────────────────

export function explainPasswordStrength(analysis: PasswordAnalysis): string {
  const { score, issues, entropy } = analysis

  if (score >= 80) {
    return `🔐 Excellent password! ${Math.round(entropy)} bits of entropy makes it virtually uncrackable. This password would take billions of years to brute-force.`
  }
  if (score >= 60) {
    return `✅ Strong password with ${Math.round(entropy)} bits of entropy. Minor improvements possible: ${issues[0] ?? 'none needed'}.`
  }
  if (score >= 40) {
    return `⚠️ Fair password. Issues found: ${issues.join(', ')}. Adding length and symbols significantly improves security.`
  }
  if (score >= 20) {
    return `❌ Weak password (${Math.round(entropy)} bits entropy). Critical issues: ${issues.join(', ')}. This could be cracked in minutes.`
  }
  return `🚨 Very weak password. ${issues.join(', ')}. This offers almost no security. Replace immediately.`
}

// ─────────────────────────────────────────────
// Phishing / Suspicious Domain Detector
// ─────────────────────────────────────────────

const KNOWN_BRANDS = [
  'google', 'gmail', 'facebook', 'instagram', 'twitter', 'x', 'apple', 'icloud',
  'microsoft', 'outlook', 'hotmail', 'amazon', 'aws', 'paypal', 'netflix', 'github',
  'discord', 'spotify', 'linkedin', 'youtube', 'reddit', 'dropbox', 'slack',
  'zoom', 'binance', 'coinbase', 'bank', 'chase', 'wellsfargo', 'citibank',
]

const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.icu', '.vip']

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '@': 'a',
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().split('').map(c => LEET_MAP[c] ?? c).join('')
}

function hasBrandImpersonation(domain: string): boolean {
  const normalized = normalizeDomain(domain)
  return KNOWN_BRANDS.some(brand => {
    if (normalized.includes(brand) && !domain.toLowerCase().startsWith(brand)) return true
    if (domain !== normalized && normalized.includes(brand)) return true
    return false
  })
}

export function analyzeDomain(domain: string): DomainRiskResult {
  const clean = getDomainFromString(domain)
  const reasons: string[] = []
  let riskLevel: DomainRiskResult['riskLevel'] = 'safe'

  // Check suspicious TLDs
  if (SUSPICIOUS_TLDS.some(tld => clean.endsWith(tld))) {
    reasons.push(`Suspicious TLD (${SUSPICIOUS_TLDS.find(tld => clean.endsWith(tld))})`)
    riskLevel = 'high'
  }

  // Check leet-speak impersonation
  if (hasBrandImpersonation(clean)) {
    reasons.push('May be impersonating a known brand')
    riskLevel = 'critical'
  }

  // Check for IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(clean)) {
    reasons.push('Domain is an IP address (unusual)')
    riskLevel = riskLevel === 'critical' ? 'critical' : 'medium'
  }

  // Excessive subdomains
  const parts = clean.split('.')
  if (parts.length > 4) {
    reasons.push('Excessive subdomain depth')
    riskLevel = riskLevel === 'safe' ? 'low' : riskLevel
  }

  // Very long domain
  if (clean.length > 50) {
    reasons.push('Unusually long domain name')
    riskLevel = riskLevel === 'safe' ? 'low' : riskLevel
  }

  // Hyphens suggesting spoofing
  const hyphens = (clean.match(/-/g) ?? []).length
  if (hyphens >= 3) {
    reasons.push('Multiple hyphens (common in phishing domains)')
    riskLevel = riskLevel === 'safe' ? 'medium' : riskLevel
  }

  return {
    domain: clean,
    isSuspicious: riskLevel !== 'safe',
    riskLevel,
    reasons,
  }
}

function getDomainFromString(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// ─────────────────────────────────────────────
// AI Chat Engine
// ─────────────────────────────────────────────

export interface ChatContext {
  vaultItemCount: number
  weakPasswordCount: number
  reusedPasswordCount: number
  securityScore: number
}

const SECURITY_TIPS = [
  "Use a unique password for every site — password reuse is the #1 cause of account takeovers.",
  "Enable two-factor authentication wherever possible for an extra security layer.",
  "A strong password has 16+ characters with uppercase, lowercase, numbers, and symbols.",
  "Never share your master password — VaultGuard never asks for it.",
  "Regularly audit your vault with the Security Report to find weak or reused passwords.",
  "Passphrase-style passwords like 'Crimson!Tiger$Orbit92' are both strong and memorable.",
  "Check domains carefully before autofilling — phishing sites look nearly identical to real ones.",
  "Your clipboard is cleared automatically after 15 seconds to prevent password snooping.",
]

export function processAIMessage(
  userMessage: string,
  context?: ChatContext
): { response: string; generatedPassword?: GeneratedPassword } {
  const msg = userMessage.toLowerCase().trim()

  // Password generation
  if (msg.includes('generat') || msg.includes('creat') || msg.includes('make') || msg.includes('suggest')) {
    let context_type: PasswordGeneratorConfig['context'] = 'general'
    if (msg.includes('bank') || msg.includes('financ')) context_type = 'banking'
    else if (msg.includes('social') || msg.includes('instagram') || msg.includes('twitter')) context_type = 'social'
    else if (msg.includes('work') || msg.includes('office')) context_type = 'work'
    else if (msg.includes('email') || msg.includes('mail')) context_type = 'email'

    const memorable = msg.includes('memorabl') || msg.includes('remember') || msg.includes('easy')
    const length = msg.match(/(\d+)\s*(char|letter|length)/)?.[1]

    const config: PasswordGeneratorConfig = {
      length: length ? parseInt(length) : context_type === 'banking' ? 24 : 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: !memorable,
      memorable,
      context: context_type,
    }

    const generated = generatePassword(config)
    return {
      response: `🔐 Generated a ${context_type} password for you!\n\n${generated.explanation}\n\nStrength: ${generated.strength.replace('-', ' ')} (${generated.score}/100)`,
      generatedPassword: generated,
    }
  }

  // Domain check
  if (msg.includes('domain') || msg.includes('site') || msg.includes('phish') || msg.includes('safe')) {
    const domainMatch = userMessage.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/)?.[0]
    if (domainMatch) {
      const result = analyzeDomain(domainMatch)
      if (result.isSuspicious) {
        return { response: `⚠️ **${domainMatch}** looks suspicious!\n\nRisk level: ${result.riskLevel.toUpperCase()}\n\nReasons:\n${result.reasons.map(r => `• ${r}`).join('\n')}\n\nDo NOT enter your credentials on this site.` }
      }
      return { response: `✅ **${domainMatch}** appears to be safe. No suspicious patterns detected.` }
    }
    return { response: "Please share the domain you'd like me to analyze. Example: 'Is paypa1.com safe?'" }
  }

  // Vault health
  if (msg.includes('health') || msg.includes('score') || msg.includes('audit') || msg.includes('weak')) {
    if (context) {
      const { securityScore, weakPasswordCount, reusedPasswordCount } = context
      let response = `📊 **Vault Health Report**\n\nSecurity Score: ${securityScore}/100\n`
      if (weakPasswordCount > 0) response += `\n⚠️ ${weakPasswordCount} weak password${weakPasswordCount > 1 ? 's' : ''} found`
      if (reusedPasswordCount > 0) response += `\n🔄 ${reusedPasswordCount} reused password${reusedPasswordCount > 1 ? 's' : ''} detected`
      if (securityScore >= 80) response += '\n\n✅ Your vault is in great shape!'
      else response += '\n\n💡 Visit the Security Report to fix these issues.'
      return { response }
    }
    return { response: "Your vault health details are available in the Security Report. Click the Security tab to see a full breakdown." }
  }

  // Tips
  if (msg.includes('tip') || msg.includes('advice') || msg.includes('help') || msg.includes('how')) {
    const tip = SECURITY_TIPS[Math.floor(Math.random() * SECURITY_TIPS.length)]
    return { response: `💡 **Security Tip**\n\n${tip}` }
  }

  // Explain concepts
  if (msg.includes('encrypt') || msg.includes('aes') || msg.includes('how.*work')) {
    return { response: "🔒 **How VaultGuard Encrypts Your Data**\n\nYour master password → PBKDF2 key derivation (100,000 iterations) → AES-GCM 256-bit encryption key.\n\nEach password is encrypted with a unique random IV before storage. Even if someone steals your storage, they get encrypted garbage without your master password.\n\nYour master password is NEVER stored — only a cryptographic verifier." }
  }

  // Greetings
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return { response: "👋 Hi! I'm VaultGuard's AI security assistant.\n\nI can help you:\n• Generate strong passwords\n• Check if a domain is suspicious\n• Audit your vault health\n• Explain security concepts\n\nWhat can I help you with?" }
  }

  // Default
  return {
    response: `🤖 I can help you with:\n\n• **Generate password** — "Generate a banking password"\n• **Check domain** — "Is paypa1.com safe?"\n• **Vault health** — "Audit my vault"\n• **Security tips** — "Give me a tip"\n• **Explain security** — "How does encryption work?"\n\nWhat would you like to know?`
  }
}
