import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleMessage } from './index'

describe('Background Script - Security Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(chrome.storage.session as any).get = vi.fn().mockResolvedValue({ session_key: 'mockBase64Key' })
  })

  it('should reject structurally invalid messages', async () => {
    const res = await handleMessage(null as any, {})
    expect(res).toEqual({ error: 'Invalid message structure' })

    const res2 = await handleMessage({} as any, {})
    expect(res2).toEqual({ error: 'Invalid message structure' })
  })

  it('should reject GET_CREDENTIALS_FOR_DOMAIN with missing domain payload', async () => {
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: null }, {})
    expect((res as any).credentials).toEqual([])
  })

  it('should reject GET_CREDENTIALS_FOR_DOMAIN with oversized domain payload', async () => {
    const hugePayload = 'a'.repeat(300) + '.com'
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: hugePayload }, {})
    expect((res as any).credentials).toEqual([])
  })

  it('should reject GET_CREDENTIALS_FOR_DOMAIN with invalid characters in domain', async () => {
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: 'github.com<script>' }, {})
    expect((res as any).credentials).toEqual([])
  })

  it('should block domain spoofing attempt (tab URL mismatch)', async () => {
    const sender = { tab: { id: 1, url: 'https://attacker.com' } }
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: 'github.com' }, sender as any)
    expect((res as any).credentials).toEqual([])
  })

  it('should allow GET_CREDENTIALS_FOR_DOMAIN if tab URL matches requested domain', async () => {
    const sender = { tab: { id: 2, url: 'https://github.com/login' } }
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: 'github.com' }, sender as any)
    expect((res as any).credentials).toEqual([])
  })

  it('should block rapid credential requests (rate limiting)', async () => {
    const sender = { tab: { id: 3, url: 'https://github.com' } }
    
    // Fire 10 requests rapidly
    for (let i = 0; i < 11; i++) {
      await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: 'github.com' }, sender as any)
    }

    // 12th request should be rate limited
    const res = await handleMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: 'github.com' }, sender as any)
    expect((res as any).rateLimited).toBe(true)
  })

  it('should validate VAULT_UNLOCK payload', async () => {
    // Missing payload
    const res1 = await handleMessage({ type: 'VAULT_UNLOCK' }, {})
    expect(res1).toEqual({ error: 'Invalid session key format' })

    // Non-string payload
    const res2 = await handleMessage({ type: 'VAULT_UNLOCK', payload: 123 }, {})
    expect(res2).toEqual({ error: 'Invalid session key format' })

    // Too large payload
    const res3 = await handleMessage({ type: 'VAULT_UNLOCK', payload: 'A'.repeat(600) }, {})
    expect(res3).toEqual({ error: 'Invalid session key format' })

    // Invalid base64
    const res4 = await handleMessage({ type: 'VAULT_UNLOCK', payload: 'invalid chars !@#' }, {})
    expect(res4).toEqual({ error: 'Invalid session key format' })
  })

  it('should handle VAULT_LOCK gracefully', async () => {
    const removeSpy = vi.fn().mockResolvedValue(undefined)
    ;(chrome.storage.session as any).remove = removeSpy

    const res = await handleMessage({ type: 'VAULT_LOCK' }, {})
    expect(res).toEqual({ success: true })
    expect(removeSpy).toHaveBeenCalledWith(['session_key'])
  })

  it('should handle PING and GET_VAULT_STATE', async () => {
    const ping = await handleMessage({ type: 'PING' }, {})
    expect(ping).toEqual({ status: 'ok', isVaultLocked: false })

    const state = await handleMessage({ type: 'GET_VAULT_STATE' }, {})
    expect(state).toEqual({ isLocked: false })
  })

  it('should handle AUTOFILL_FILL telemetry', async () => {
    const res = await handleMessage({ type: 'AUTOFILL_FILL' }, {})
    expect(res).toEqual({ success: true })
  })

  it('should reject unknown message types', async () => {
    const res = await handleMessage({ type: 'UNKNOWN_MSG_TYPE' } as any, {})
    expect(res).toEqual({ error: 'Unknown message type: UNKNOWN_MSG_TYPE' })
  })
})
