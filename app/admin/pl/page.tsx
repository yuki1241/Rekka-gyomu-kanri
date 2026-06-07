'use client'

import { useEffect, useState, useCallback } from 'react'
import { PieChart, TrendingUp, XCircle } from 'lucide-react'
import clsx from 'clsx'
import AdminGuard from '@/components/AdminGuard'

interface ProspectClient {
  id: string
  company_name: string
  contact_name: string
  status: '見込み' | '成約' | '失注'
  term: '短期' | '中期' | '長期' | null
  amount: number | null
  lost_reason: string | null
  lost_reason_detail: string | null
  user_email?: string
}

const LOST_REASONS = ['採用が決まった', '音信不通', '自然消滅', '他社を利用', 'サービスが不要になった', '見積金額が高かった', 'その他'] as const

const REASON_COLORS: Record<string, string> = {
  '採用が決まった': 'bg-blue-400',
  '音信不通': 'bg-gray-400',
  '自然消滅': 'bg-teal-400',
  '他社を利用': 'bg-orange-400',
  'サービスが不要になった': 'bg-purple-400',
  '見積金額が高かった': 'bg-amber-400',
  'その他': 'bg-rose-400',
  '未選択': 'bg-gray-200',
}

const formatYen = (n: number) => `¥${n.toLocaleString()}`

const STATUS_STYLES: Record<string, string> = {
  '見込み': 'bg-blue-100 text-blue-700',
  '成約': 'bg-green-100 text-green-700',
  '失注': 'bg-gray-100 text-gray-500',
}

function AdminPlContent() {
  const [prospects, setProspects] = useState<ProspectClient[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/prospects?all=1')
    if (res.ok) setProspects(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  if (loading) {
    return <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
  }

  const total = prospects.length
  const won = prospects.filter((p) => p.status === '成約').length
  const lost = prospects.filter((p) => p.status === '失注')
  const inProgress = prospects.filter((p) => p.status === '見込み').length
  const winRate = won + lost.length > 0 ? Math.round((won / (won + lost.length)) * 100) : 0

  // 失注理由ごとの件数・金額集計
  const sumAmount = (rows: ProspectClient[]) => rows.reduce((acc, p) => acc + (p.amount ?? 0), 0)
  const reasonCounts = LOST_REASONS.map((reason) => {
    const rows = lost.filter((p) => p.lost_reason === reason)
    return { reason, count: rows.length, amount: sumAmount(rows) }
  })
  const noReasonRows = lost.filter((p) => !p.lost_reason)
  const noReasonCount = noReasonRows.length
  const maxReasonCount = Math.max(1, ...reasonCounts.map((r) => r.count), noReasonCount)
  const lostAmountTotal = sumAmount(lost)

  const otherDetails = lost.filter((p) => p.lost_reason === 'その他' && p.lost_reason_detail)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">全体PL管理</h1>
        <p className="text-gray-500 mt-0.5 text-sm">見込みリスト全体の成約・失注状況を分析します</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">総件数</p>
          <p className="text-2xl font-bold text-gray-900">{total}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">見込み中</p>
          <p className="text-2xl font-bold text-blue-600">{inProgress}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">成約</p>
          <p className="text-2xl font-bold text-green-600">{won}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">失注 / 成約率</p>
          <p className="text-2xl font-bold text-gray-700">{lost.length}<span className="text-sm font-normal text-gray-400 ml-1">件</span>
            <span className="text-sm font-medium text-gray-400 ml-2">（{winRate}%）</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">失注による損失額</p>
          <p className="text-2xl font-bold text-rose-500">{formatYen(lostAmountTotal)}</p>
        </div>
      </div>

      {/* 失注理由分析 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <PieChart size={18} className="text-orange-400" />
          <h2 className="font-semibold text-gray-900 text-sm">失注理由の内訳</h2>
          <span className="text-xs text-gray-400">（失注 {lost.length}件中）</span>
        </div>

        {lost.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
            失注データがありません
          </div>
        ) : (
          <div className="space-y-3">
            {reasonCounts.map(({ reason, count, amount }) => {
              const pct = lost.length > 0 ? Math.round((count / lost.length) * 100) : 0
              return (
                <div key={reason} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-40 flex-shrink-0 truncate">{reason}</span>
                  <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', REASON_COLORS[reason])}
                      style={{ width: `${(count / maxReasonCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0 text-right">{count}件（{pct}%）</span>
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0 text-right">{amount > 0 ? formatYen(amount) : '-'}</span>
                </div>
              )
            })}
            {noReasonCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-40 flex-shrink-0 truncate">未選択</span>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', REASON_COLORS['未選択'])}
                    style={{ width: `${(noReasonCount / maxReasonCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-24 flex-shrink-0 text-right">
                  {noReasonCount}件（{lost.length > 0 ? Math.round((noReasonCount / lost.length) * 100) : 0}%）
                </span>
                <span className="text-xs text-gray-400 w-28 flex-shrink-0 text-right">{(() => { const a = sumAmount(noReasonRows); return a > 0 ? formatYen(a) : '-' })()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* その他の理由詳細 */}
      {otherDetails.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle size={18} className="text-rose-400" />
            <h2 className="font-semibold text-gray-900 text-sm">「その他」の理由詳細</h2>
            <span className="text-xs text-gray-400">（{otherDetails.length}件）</span>
          </div>
          <div className="space-y-2">
            {otherDetails.map((p) => (
              <div key={p.id} className="flex items-start gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-semibold text-gray-700 flex-shrink-0">{p.company_name || '（会社名未入力）'}</span>
                <span className="text-xs text-gray-500">{p.lost_reason_detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 失注リスト */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">失注一覧</h2>
        </div>
        {lost.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">失注はありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">会社名</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">担当者</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">期間分類</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">金額</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">ステータス</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">失注理由</th>
                </tr>
              </thead>
              <tbody>
                {lost.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-700">{p.company_name || '（会社名未入力）'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.contact_name || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.term ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.amount != null ? formatYen(p.amount) : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[p.status])}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {p.lost_reason
                        ? (p.lost_reason === 'その他' && p.lost_reason_detail ? `その他（${p.lost_reason_detail}）` : p.lost_reason)
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><AdminPlContent /></AdminGuard>
}
