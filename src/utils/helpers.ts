import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function getFaviconUrl(website: string): string {
  const domain = getDomainFromUrl(website)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function maskPassword(password: string): string {
  return '•'.repeat(Math.min(password.length, 16))
}

/** Copy text to clipboard and optionally auto-clear after N seconds */
export async function copyToClipboard(
  text: string,
  clearAfterSeconds?: number
): Promise<void> {
  await navigator.clipboard.writeText(text)
  if (clearAfterSeconds && clearAfterSeconds > 0) {
    setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {})
    }, clearAfterSeconds * 1000)
  }
}

export function getStrengthColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#84cc16'
  if (score >= 40) return '#eab308'
  if (score >= 20) return '#f97316'
  return '#ef4444'
}

export function getStrengthLabel(score: number): string {
  if (score >= 80) return 'Very Strong'
  if (score >= 60) return 'Strong'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Weak'
  return 'Very Weak'
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    social: '🌐',
    finance: '🏦',
    work: '💼',
    email: '📧',
    shopping: '🛒',
    entertainment: '🎬',
    crypto: '₿',
    other: '🔑',
  }
  return icons[category] ?? '🔑'
}

export function getCardBrandIcon(brand: string): string {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    other: '💳',
  }
  return icons[brand] ?? '💳'
}
