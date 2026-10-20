'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const PERSON_NAMES = ['全体', '原', '菅野', '久保田', '太附']
const NEW_CASE_STAGES = ['人選中', 'スキルシート提出', '面談', '面談完了', 'トライアル待ち', '本契約']

interface Member { id: string; name: string; email: string }

interface ContractDetail {
  company_name: string
  term: number
  monthly_amount: number
  total_amount: number
  contracted_at: string
  user_email: string
}

interface DashboardData {
  activeCasesCount: number
  salesEstimateTotal: number
  contractsCount: number
  prospectsCount: number
  lostCount: number
  contractsAmount: number
  monthlyRevenue: number
  stageBreakdown: Record<string, number>
  currentMonth: string
  contractDetails: ContractDetail[]
}

// ¥XX,XXX 形式
function fmtYen(n: number) {
  return `¥${n.toLocaleString('ja-JP')}`
}

// 〇万円 形式（サマリ用）
function fmtMan(n: number) {
  if (n === 0) return '¥0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億円`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万円`
  return fmtYen(n)
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function CompanyDashboardPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState('全体')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMonth, setViewMonth] = useState('')

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then((d: Member[]) => Array.isArray(d) && setMembers(d))
      .catch(() => {})
  }, [])

  const load = useCallback((name: string) => {
    setLoading(true)
    let url = '/api/company-dashboard'
    if (name !== '全体') {
      const member = members.find(m => m.name === name || m.name.includes(name))
      if (member) url += `?email=${encodeURIComponent(member.email)}`
    }
    fetch(url)
      .then(r => r.json())
      .then((d: DashboardData) => {
        setData(d)
        setViewMonth(prev => prev || d.currentMonth)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [members])

  useEffect(() => {
    if (!session?.user?.email) return
    load(selected)
  }, [session, selected, load])

  // 表示月のデータ
  const monthContracts = (data?.contractDetails ?? []).filter(c =>
    c.contracted_at && c.contracted_at.startsWith(viewMonth)
  )
  const monthMonthlyTotal = monthContracts.reduce((s, c) => s + c.monthly_amount, 0)
  const monthFinalTotal = monthContracts.reduce((s, c) =>
    s + (c.total_amount > 0 ? c.total_amount : c.monthly_amount), 0)

  // 全体合計
  const grandTotal = (data?.contractDetails ?? []).reduce((s, c) =>
    s + (c.total_amount > 0 ? c.total_amount : c.monthly_amount), 0)

  const totalProspects = (data?.contractsCount ?? 0) + (data?.prospectsCount ?? 0) + (data?.lostCount ?? 0)
  const totalStage = NEW_CASE_STAGES.reduce((s, st) => s + (data?.stageBreakdown[st] ?? 0), 0)

  // 表示月ラベル（例: 2026/10）
  const viewLabel = viewMonth ? viewMonth.replace('-', '/') : ''
  // 今月ラベル（例: 10月）
  const currentMonthNum = data?.currentMonth?.split('-')[1]?.replace(/^0/, '') ?? ''
  const canGoNext = viewMonth < (data?.currentMonth ?? '')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">数値管理</h1>
            <p className="text-xs text-gray-400">全体の契約・売上・稼働状況</p>
          </div>
        </div>
        <button
          onClick={() => load(selected)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          更新
        </button>
      </div>

      {/* メンバーフィルター */}
      <div className="flex gap-2 mb-6">
        {PERSON_NAMES.map(name => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selected === name
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>}

      {!loading && data && (
        <>
          {/* ① 〇月数値ボックス */}
          <div className="border border-gray-200 rounded-2xl p-7 mb-5">
            <p className="text-2xl font-bold text-gray-800 mb-6">
              {currentMonthNum}月数値
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">稼働件数</p>
                <p className="text-3xl font-bold text-gray-800">{data.activeCasesCount}<span className="text-base font-normal text-gray-500">件</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">成約数</p>
                <p className="text-3xl font-bold text-gray-800">{data.contractsCount}<span className="text-base font-normal text-gray-500">件</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">売り上げ見込み</p>
                <p className="text-3xl font-bold text-gray-800">{fmtMan(data.salesEstimateTotal)}</p>
              </div>
            </div>
          </div>

          {/* ② 月別契約テーブル */}
          <div className="border border-gray-200 rounded-2xl p-6 mb-3">
            {/* 月ナビゲーション */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => setViewMonth(m => addMonths(m, -1))}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-base font-semibold text-gray-800 w-24 text-center">{viewLabel}</span>
              <button
                onClick={() => setViewMonth(m => addMonths(m, 1))}
                disabled={!canGoNext}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">契約会社名</th>
                  {selected === '全体' && (
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">契約担当者</th>
                  )}
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">契約月数</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">月額料金</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-medium">最終金額</th>
                </tr>
              </thead>
              <tbody>
                {monthContracts.length === 0 ? (
                  <tr>
                    <td colSpan={selected === '全体' ? 5 : 4} className="py-6 text-center text-xs text-gray-400">この月の成約データなし</td>
                  </tr>
                ) : (
                  monthContracts.map((c, i) => {
                    const final = c.total_amount > 0 ? c.total_amount : c.monthly_amount
                    const personName = members.find(m => m.email === c.user_email)?.name ?? c.user_email
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-800">{c.company_name || '—'}</td>
                        {selected === '全体' && (
                          <td className="py-2.5 text-gray-600">{personName || '—'}</td>
                        )}
                        <td className="py-2.5 text-right text-gray-600">{c.term > 0 ? `${c.term}ヵ月` : '—'}</td>
                        <td className="py-2.5 text-right text-gray-600">{c.monthly_amount > 0 ? fmtYen(c.monthly_amount) : '—'}</td>
                        <td className="py-2.5 text-right font-medium text-gray-800">{final > 0 ? fmtYen(final) : '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {monthContracts.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="pt-3 text-xs text-gray-400"></td>
                    {selected === '全体' && <td className="pt-3"></td>}
                    <td className="pt-3 text-right text-sm font-semibold text-gray-700">合計</td>
                    <td className="pt-3 text-right font-semibold text-gray-800">{fmtYen(monthMonthlyTotal)}</td>
                    <td className="pt-3 text-right font-semibold text-gray-800">{fmtYen(monthFinalTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ③ 合計売上予想金額 */}
          <div className="flex items-center justify-between px-4 py-3 mb-5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-sm font-medium text-gray-600">合計売上予想金額</span>
            <span className="text-lg font-bold text-orange-500">{fmtMan(grandTotal)}</span>
          </div>

          {/* ④ 詳細パネル */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">新規案件 ステージ別</h2>
              {totalStage === 0 ? (
                <p className="text-xs text-gray-400">データなし</p>
              ) : (
                <div className="space-y-2.5">
                  {NEW_CASE_STAGES.map(stage => {
                    const count = data.stageBreakdown[stage] ?? 0
                    const pct = totalStage > 0 ? Math.round((count / totalStage) * 100) : 0
                    return (
                      <div key={stage}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{stage}</span>
                          <span className="font-medium text-gray-800">{count}件</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">見込みリスト パイプライン</h2>
              {totalProspects === 0 ? (
                <p className="text-xs text-gray-400">データなし</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: '見込み', count: data.prospectsCount, color: 'bg-blue-400' },
                    { label: '成約', count: data.contractsCount, color: 'bg-green-400' },
                    { label: '失注', count: data.lostCount, color: 'bg-gray-300' },
                  ].map(({ label, count, color }) => {
                    const pct = totalProspects > 0 ? Math.round((count / totalProspects) * 100) : 0
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-800">{count}件 ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                    <span className="text-gray-500">合計</span>
                    <span className="font-semibold text-gray-800">{totalProspects}件</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
