// Edge Runtime & Node.js 両対応（Web Crypto API使用）

export const COOKIE_NAME = 'otp_session'
export const MAX_AGE = 60 * 60 * 8 // 8時間

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? 'fallback-secret'
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createOtpCookieValue(email: string): Promise<string> {
  const ts = Date.now().toString()
  const sig = await hmacSign(`${email}|${ts}`)
  return btoa(`${email}|${ts}|${sig}`)
}

export async function verifyOtpCookie(cookieValue: string, email: string): Promise<boolean> {
  try {
    const decoded = atob(cookieValue)
    const firstBar = decoded.indexOf('|')
    const secondBar = decoded.indexOf('|', firstBar + 1)
    if (firstBar === -1 || secondBar === -1) return false
    const storedEmail = decoded.slice(0, firstBar)
    const ts = decoded.slice(firstBar + 1, secondBar)
    const sig = decoded.slice(secondBar + 1)
    if (storedEmail !== email) return false
    if (Date.now() - parseInt(ts) > MAX_AGE * 1000) return false
    const expected = await hmacSign(`${email}|${ts}`)
    return sig === expected
  } catch {
    return false
  }
}
