'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Flame, Mail, RefreshCw, ShieldCheck } from 'lucide-react'

const RESEND_WAIT = 60 // 再送信まで60秒

export default function VerifyOtpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sent, setSent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const sendOtp = useCallback(async () => {
    setSending(true)
    setError('')
    const res = await fetch('/api/auth/send-otp', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'メール送信に失敗しました')
    } else {
      setSent(true)
      setCountdown(RESEND_WAIT)
    }
    setSending(false)
  }, [])

  // セッション確認後に自動送信
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    } else if (status === 'authenticated' && !sent) {
      sendOtp()
    }
  }, [status, router, sendOtp, sent])

  // カウントダウン
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...code]
    next[idx] = val.slice(-1)
    setCode(next)
    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) return
    setVerifying(true)
    setError('')
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: fullCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '認証に失敗しました')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      router.replace('/')
    }
    setVerifying(false)
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  const email = session?.user?.email ?? ''
  const maskedEmail = email.replace(/(.{2})(.+)(@.+)/, '$1***$3')
  const codeComplete = code.every((c) => c !== '')

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1C1410 0%, #2D1F14 50%, #1C1410 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-600/5 blur-3xl" />
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        {/* ロゴ */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Flame size={20} className="text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold text-white tracking-wide">Rekka Portal</h1>
            <p className="text-[10px] text-orange-400/70 uppercase tracking-widest">Business System</p>
          </div>
        </div>

        {/* アイコン */}
        <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} className="text-blue-400" />
        </div>

        <h2 className="text-base font-bold text-white mb-1">2段階認証</h2>
        <div className="flex items-center justify-center gap-1.5 text-xs text-white/40 mb-6">
          <Mail size={12} />
          <span>{maskedEmail} に送信しました</span>
        </div>

        {/* 6桁入力 */}
        <div className="flex gap-2 justify-center mb-2" onPaste={handlePaste}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-13 text-center text-xl font-bold text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all"
              style={{ height: '52px' }}
              disabled={verifying}
            />
          ))}
        </div>
        <p className="text-[11px] text-white/25 mb-5">コードを貼り付けると自動入力されます</p>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* 認証ボタン */}
        <button
          onClick={handleVerify}
          disabled={!codeComplete || verifying}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20 mb-4"
        >
          {verifying ? '確認中...' : '認証する'}
        </button>

        {/* 再送信 */}
        <button
          onClick={() => { setCode(['', '', '', '', '', '']); sendOtp() }}
          disabled={sending || countdown > 0}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-white/40 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={12} className={sending ? 'animate-spin' : ''} />
          {countdown > 0 ? `再送信まで ${countdown}秒` : sending ? '送信中...' : 'コードを再送信'}
        </button>
      </div>
    </div>
  )
}
