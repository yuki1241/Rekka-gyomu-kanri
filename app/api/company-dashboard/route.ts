import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  const supabase = createServerSupabase()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. ディレクター案件
  let casesQuery = supabase
    .from('director_cases')
    .select('id, case_name, client_name, sales_estimate, case_status, is_archived, director_email, sales_email, case_stage, updated_at')
  if (email) {
    casesQuery = casesQuery.or(`director_email.eq.${email},sales_email.eq.${email}`)
  }
  const { data: cases } = await casesQuery

  const allCases = cases ?? []
  const activeCases = allCases.filter(c => !c.is_archived)
  const salesEstimateTotal = activeCases.reduce((sum, c) => sum + (c.sales_estimate ?? 0), 0)

  const cancellationCases = activeCases.filter(c =>
    typeof c.case_status === 'string' && c.case_status.includes('解約')
  )
  const activeRunningCases = activeCases.filter(c =>
    !c.case_status || c.case_status === '稼働中' || c.case_status === '対応中'
  )

  const stageBreakdown: Record<string, number> = {}
  for (const c of activeCases) {
    const stage = c.case_stage || ''
    if (stage) stageBreakdown[stage] = (stageBreakdown[stage] ?? 0) + 1
  }

  // 2. 見込みリスト
  let prospectsQuery = supabase
    .from('prospect_clients')
    .select('id, status, amount, user_email, company_name, contact_name, term, contracted_at')
  if (email) prospectsQuery = prospectsQuery.eq('user_email', email)
  const { data: prospects } = await prospectsQuery

  const allProspects = prospects ?? []
  const contractsCount = allProspects.filter(p => p.status === '成約').length
  const prospectsCount = allProspects.filter(p => p.status === '見込み').length
  const lostCount = allProspects.filter(p => p.status === '失注').length
  const contractsAmount = allProspects
    .filter(p => p.status === '成約')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const newContractsThisMonth = allProspects.filter(p =>
    p.status === '成約' && typeof p.contracted_at === 'string' && p.contracted_at.startsWith(currentMonth)
  ).length

  const contractDetails = allProspects
    .filter(p => p.status === '成約')
    .map(p => ({
      company_name: p.company_name ?? '',
      term: p.term ?? 0,
      monthly_amount: p.amount ?? 0,
      total_amount: (p.term ?? 0) * (p.amount ?? 0),
      contracted_at: p.contracted_at ?? '',
      user_email: p.user_email ?? '',
    }))
    .sort((a, b) => b.contracted_at.localeCompare(a.contracted_at))

  // 3. 請求管理（当月）
  let invoiceQuery = supabase
    .from('invoice_records')
    .select('items, user_email, month')
    .eq('month', currentMonth)
  if (email) invoiceQuery = invoiceQuery.eq('user_email', email)
  const { data: invoices } = await invoiceQuery

  const monthlyRevenue = (invoices ?? []).reduce((sum, inv) => {
    const items: { amount?: number; quantity?: number; unit_price?: number }[] =
      Array.isArray(inv.items) ? inv.items : []
    return sum + items.reduce((s, item) =>
      s + (item.amount ?? (item.quantity ?? 0) * (item.unit_price ?? 0)), 0)
  }, 0)

  // 可視化指標用詳細リスト
  const newContractsDetails = allProspects
    .filter(p => p.status === '成約' && typeof p.contracted_at === 'string' && p.contracted_at.startsWith(currentMonth))
    .map(p => ({ company_name: p.company_name ?? '', amount: p.amount ?? 0, user_email: p.user_email ?? '' }))

  const activeRunningDetails = activeRunningCases.map(c => ({
    case_name: c.case_name ?? '',
    client_name: c.client_name ?? '',
    director_email: c.director_email ?? '',
    sales_email: c.sales_email ?? '',
    sales_estimate: c.sales_estimate ?? 0,
  }))

  const cancellationDetails = cancellationCases.map(c => ({
    case_name: c.case_name ?? '',
    client_name: c.client_name ?? '',
    case_status: c.case_status ?? '',
    director_email: c.director_email ?? '',
    sales_email: c.sales_email ?? '',
  }))

  const prospectsDetails = allProspects
    .filter(p => p.status === '見込み')
    .map(p => ({
      company_name: p.company_name ?? '',
      contact_name: p.contact_name ?? '',
      amount: p.amount ?? 0,
      user_email: p.user_email ?? '',
    }))

  return NextResponse.json({
    activeCasesCount: activeCases.length,
    activeRunningCount: activeRunningCases.length,
    cancellationCount: cancellationCases.length,
    newContractsThisMonth,
    salesEstimateTotal,
    contractsCount,
    prospectsCount,
    lostCount,
    contractsAmount,
    monthlyRevenue,
    stageBreakdown,
    currentMonth,
    contractDetails,
    newContractsDetails,
    activeRunningDetails,
    cancellationDetails,
    prospectsDetails,
  })
}
