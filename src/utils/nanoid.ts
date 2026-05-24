/** Simple nanoid-like ID generator using crypto.getRandomValues */
export function nanoid(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}
