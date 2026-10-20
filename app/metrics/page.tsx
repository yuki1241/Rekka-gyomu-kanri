'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Users, Target } from 'lucide-react'

const PERSON_NAMES = ['全体', '原', '菅野', '久保田', '太附']

interface Member { id: string; name: string; email: string }

interface ActiveDetail {
  case_name: string
  client_name: string
  director_email: string
  sales_email: string
  sales_estimate: number
}
interface CancellationDetail {
  case_name: string
  client_name: string
  case_status: string
  director_email: string
  sales_email: string
}
interface NewContractDetail {
  company_name: string
  amount: number
  user_email: string
}
interface ProspectDetail {
  company_name: string
  contact_name: string
  amount: number
  user_email: string
}

interface MetricsData {
  activeCasesCount: number
  activeRunningCount: number
  cancellationCount: number
  newContractsThisMonth: number
  contractsCount: number
  prospectsCount: number
  lostCount: number
  monthlyRevenue: number
  currentMonth: string
  newContractsDetails: NewContractDetail[]
  activeRunningDetails: ActiveDetail[]
  cancellationDetails: CancellationDetail[]
  prospectsDetails: ProspectDetail[]
}

function fmtYen(n: number) {
  if (n === 0) return '—'
  return `¥${n.toLocaleString('ja-JP')}`
}

function RadialProgress({ pct, color }: { pct: number; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#f3f4f6" strokeWidth="9" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="55" y="60" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1f2937">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function SectionCard({
  icon: Icon,
  iconBg,
  count,
  label,
  sub,
  children,
}: {
  icon: React.ElementType
  iconBg: string
  count: number
  label: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-5 border-b border-gray-50">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <p className="text-3xl font-bold text-gray-800">{count}<span className="text-base font-normal text-gray-400">件</span></p>
      </div>
      {children && <div className="p-4">{children}</div>}
    </div>
  )
}

export default function MetricsPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState('全体')
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then((d: Member[]) => Array.isArray(d) && setMembers(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`metrics_target_${selected}`)
      setTargetInput(saved ?? '')
    } catch { setTargetInput('') }
  }, [selected])

  const saveTarget = (val: string) => {
    setTargetInput(val)
    try { localStorage.setItem(`metrics_target_${selected}`, val) } catch { /* noop */ }
  }

  const load = useCallback((name: string) => {
    setLoading(true)
    let url = '/api/company-dashboard'
    if (name !== '全体') {
      const member = members.find(m => m.name === name || m.name.includes(name))
      if (member) url += `?email=${encodeURIComponent(member.email)}`
    }
    fetch(url)
      .then(r => r.json())
      .then((d: MetricsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [members])

  useEffect(() => {
    if (!session?.user?.email) return
    load(selected)
  }, [session, selected, load])

  const resolveName = (email: string) =>
    members.find(m => m.email === email)?.name ?? email ?? '—'

  const targetInYen = (parseFloat(targetInput.replace(/[^\d.]/g, '')) || 0) * 10000
  const totalProspects = (data?.contractsCount ?? 0) + (data?.prospectsCount ?? 0) + (data?.lostCount ?? 0)
  const achievePct = targetInYen > 0 && data ? (data.monthlyRevenue / targetInYen) * 100 : 0
  const conversionPct = totalProspects > 0 && data ? (data.contractsCount / totalProspects) * 100 : 0
  const displayPct = targetInYen > 0 ? achievePct : conversionPct
  const progressColor = displayPct >= 100 ? '#22c55e' : displayPct >= 50 ? '#f97316' : '#ef4444'

  const currentMonthNum = data?.currentMonth?.split('-')[1]?.replace(/^0/, '') ?? ''

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">可視化指標</h1>
            <p className="text-xs text-gray-400">新規契約・稼働・解約・見込み・目標達成率</p>
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
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-500'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>}

      {!loading && data && (
        <div className="space-y-4">

          {/* ① 新規契約数（今月） */}
          <SectionCard
            icon={CheckCircle2} iconBg="bg-green-500"
            count={data.newContractsThisMonth}
            label="新規契約数" sub={`${currentMonthNum}月`}
          >
            {data.newContractsDetails.length === 0 ? (
              <p className="text-xs text-gray-400">今月の新規契約なし</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">契約会社名</th>
                    {selected === '全体' && <th className="text-left py-1.5 font-medium">担当者</th>}
                    <th className="text-right py-1.5 font-medium">月額料金</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newContractsDetails.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{c.company_name || '—'}</td>
                      {selected === '全体' && <td className="py-2 text-gray-600">{resolveName(c.user_email)}</td>}
                      <td className="py-2 text-right text-gray-600">{fmtYen(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* ② 稼働中件数 */}
          <SectionCard
            icon={Users} iconBg="bg-blue-500"
            count={data.activeRunningCount}
            label="稼働中件数"
          >
            {data.activeRunningDetails.length === 0 ? (
              <p className="text-xs text-gray-400">稼働中の案件なし</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">案件名</th>
                    <th className="text-left py-1.5 font-medium">クライアント</th>
                    <th className="text-left py-1.5 font-medium">ディレクター</th>
                    <th className="text-left py-1.5 font-medium">営業</th>
                    <th className="text-right py-1.5 font-medium">売上見込み</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeRunningDetails.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{c.case_name || '—'}</td>
                      <td className="py-2 text-gray-600">{c.client_name || '—'}</td>
                      <td className="py-2 text-gray-600">{resolveName(c.director_email)}</td>
                      <td className="py-2 text-gray-600">{resolveName(c.sales_email)}</td>
                      <td className="py-2 text-right text-gray-600">{fmtYen(c.sales_estimate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* ③ 解約予定件数 */}
          <SectionCard
            icon={XCircle} iconBg="bg-red-400"
            count={data.cancellationCount}
            label="解約予定件数"
          >
            {data.cancellationDetails.length === 0 ? (
              <p className="text-xs text-gray-400">解約予定の案件なし</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">案件名</th>
                    <th className="text-left py-1.5 font-medium">クライアント</th>
                    <th className="text-left py-1.5 font-medium">ステータス</th>
                    <th className="text-left py-1.5 font-medium">ディレクター</th>
                    <th className="text-left py-1.5 font-medium">営業</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cancellationDetails.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{c.case_name || '—'}</td>
                      <td className="py-2 text-gray-600">{c.client_name || '—'}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-500 font-medium">{c.case_status}</span>
                      </td>
                      <td className="py-2 text-gray-600">{resolveName(c.director_email)}</td>
                      <td className="py-2 text-gray-600">{resolveName(c.sales_email)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* ④ 見込み案件数 */}
          <SectionCard
            icon={AlertTriangle} iconBg="bg-yellow-400"
            count={data.prospectsCount}
            label="見込み案件数"
          >
            {data.prospectsDetails.length === 0 ? (
              <p className="text-xs text-gray-400">見込み案件なし</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">会社名</th>
                    <th className="text-left py-1.5 font-medium">担当者名</th>
                    {selected === '全体' && <th className="text-left py-1.5 font-medium">営業担当</th>}
                    <th className="text-right py-1.5 font-medium">月額料金</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prospectsDetails.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{p.company_name || '—'}</td>
                      <td className="py-2 text-gray-600">{p.contact_name || '—'}</td>
                      {selected === '全体' && <td className="py-2 text-gray-600">{resolveName(p.user_email)}</td>}
                      <td className="py-2 text-right text-gray-600">{fmtYen(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* ⑤ 目標達成率 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">目標達成率</p>
                <p className="text-xs text-gray-400">{targetInYen > 0 ? '月次売上目標に対する達成率' : '成約転換率（目標未設定）'}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              <RadialProgress pct={displayPct} color={progressColor} />

              <div className="flex-1 w-full space-y-3">
                {targetInYen > 0 ? (
                  <>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">月次目標</span>
                      <span className="font-semibold text-gray-800">{fmtYen(targetInYen)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">当月請求額（実績）</span>
                      <span className="font-semibold text-gray-800">{fmtYen(data.monthlyRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">差額</span>
                      <span className={`font-semibold ${data.monthlyRevenue >= targetInYen ? 'text-green-500' : 'text-red-400'}`}>
                        {data.monthlyRevenue >= targetInYen ? '+' : ''}{fmtYen(data.monthlyRevenue - targetInYen)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">見込み</span>
                      <span className="font-semibold text-gray-800">{data.prospectsCount}件</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">成約</span>
                      <span className="font-semibold text-gray-800">{data.contractsCount}件</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">失注</span>
                      <span className="font-semibold text-gray-800">{data.lostCount}件</span>
                    </div>
                  </>
                )}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(displayPct, 100)}%`, background: progressColor }} />
                </div>
                <div className="pt-1 flex items-center gap-3">
                  <Target size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500">月次売上目標（万円）:</span>
                  <input
                    type="number"
                    value={targetInput}
                    onChange={e => saveTarget(e.target.value)}
                    placeholder="例: 300"
                    className="w-28 border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-700 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
