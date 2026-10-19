'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, TrendingUp, Users, FileText, Banknote, RefreshCw } from 'lucide-react'

const PERSON_NAMES = ['全体', '原', '菅野', '久保田', '太附']
const NEW_CASE_STAGES = ['人選中', 'スキルシート提出', '面談', '面談完了', 'トライアル待ち', '本契約']

interface Member {
  id: string
  name: string
  email: string
}

interface ContractDetail {
  company_name: string
  term: number
  monthly_amount: number
  total_amount: number
  contracted_at: string
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

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万円`
  return `${n.toLocaleString()}円`
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function CompanyDashboardPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState('全体')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

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
      .then((d: DashboardData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [members])

  useEffect(() => {
    if (!session?.user?.email) return
    load(selected)
  }, [session, selected, load])

  const stageOrder = NEW_CASE_STAGES.filter(s => (data?.stageBreakdown[s] ?? 0) > 0)
  const totalStage = stageOrder.reduce((sum, s) => sum + (data?.stageBreakdown[s] ?? 0), 0)

  const totalProspects = (data?.contractsCount ?? 0) + (data?.prospectsCount ?? 0) + (data?.lostCount ?? 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">会社管理ダッシュボード</h1>
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

      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      )}

      {!loading && data && (
        <>
          {/* KPI カード */}
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
            <KpiCard
              label="稼働件数"
              value={`${data.activeCasesCount}件`}
              sub="現在の有効案件"
              icon={Users}
              color="bg-blue-500"
            />
            <KpiCard
              label="売上見込み"
              value={fmt(data.salesEstimateTotal)}
              sub="稼働案件の合計"
              icon={TrendingUp}
              color="bg-orange-500"
            />
            <KpiCard
              label="成約数"
              value={`${data.contractsCount}件`}
              sub={`成約額 ${fmt(data.contractsAmount)}`}
              icon={FileText}
              color="bg-green-500"
            />
            <KpiCard
              label="当月請求額"
              value={fmt(data.monthlyRevenue)}
              sub={`${data.currentMonth} 集計`}
              icon={Banknote}
              color="bg-purple-500"
            />
          </div>

          {/* 個人別：月ごと契約一覧 */}
          {selected !== '全体' && (() => {
            if (data.contractDetails.length === 0) return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">成約一覧</h2>
                <p className="text-xs text-gray-400">成約データなし</p>
              </div>
            )

            // 月ごとにグループ化
            const byMonth: Record<string, ContractDetail[]> = {}
            for (const c of data.contractDetails) {
              const month = c.contracted_at ? c.contracted_at.slice(0, 7) : '不明'
              if (!byMonth[month]) byMonth[month] = []
              byMonth[month].push(c)
            }
            const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))
            const grandTotal = data.contractDetails.reduce((sum, c) =>
              sum + (c.total_amount > 0 ? c.total_amount : c.monthly_amount), 0)

            return (
              <div className="mb-4 space-y-4">
                {months.map(month => {
                  const rows = byMonth[month]
                  const monthTotal = rows.reduce((sum, c) =>
                    sum + (c.total_amount > 0 ? c.total_amount : c.monthly_amount), 0)
                  const label = month === '不明' ? '不明' : `${month.replace('-', '年')}月`
                  return (
                    <div key={month} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
                        <span className="text-xs text-gray-400">小計: <span className="font-semibold text-gray-700">{fmt(monthTotal)}</span></span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1.5 font-medium">契約会社名</th>
                            <th className="text-right py-1.5 font-medium">契約月数</th>
                            <th className="text-right py-1.5 font-medium">月額料金</th>
                            <th className="text-right py-1.5 font-medium">最終金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((c, i) => {
                            const final = c.total_amount > 0 ? c.total_amount : c.monthly_amount
                            return (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-2 text-gray-800 font-medium">{c.company_name || '—'}</td>
                                <td className="py-2 text-right text-gray-600">{c.term > 0 ? `${c.term}ヶ月` : '—'}</td>
                                <td className="py-2 text-right text-gray-600">{c.monthly_amount > 0 ? fmt(c.monthly_amount) : '—'}</td>
                                <td className="py-2 text-right font-semibold text-gray-800">{final > 0 ? fmt(final) : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })}

                {/* 合計 */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">合計売上予想金額</span>
                  <span className="text-xl font-bold text-orange-500">{fmt(grandTotal)}</span>
                </div>
              </div>
            )
          })()}

          {/* 詳細パネル */}
          <div className="grid grid-cols-2 gap-4">
            {/* 新規案件ステージ */}
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
                          <div
                            className="h-full bg-orange-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 見込みリスト パイプライン */}
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
                          <div
                            className={`h-full ${color} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
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
