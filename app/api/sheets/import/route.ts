import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

// スプレッドシートの列インデックス（0始まり、列Aが0）
// B=1:タイプ, C=2:ラベル
// D=3:月合計目標, E=4:月合計実績, F=5:進捗(skip), G=6:月合計振返
// H=7:1週目目標, I=8:1週目実績, J=9:進捗(skip), K=10:1週目振返
// L=11:2週目目標, M=12:2週目実績, N=13:進捗(skip), O=14:2週目振返
// P=15:3週目目標, Q=16:3週目実績, R=17:進捗(skip), S=18:3週目振返
// T=19:4週目目標, U=20:4週目実績, V=21:進捗(skip), W=22:4週目振返
// X=23:5週目目標, Y=24:5週目実績, Z=25:進捗(skip), AA=26:5週目振返

const WEEK_COLS = [
  { week: 0, target: 3, actual: 4, reflection: 6 },   // 月合計
  { week: 1, target: 7, actual: 8, reflection: 10 },   // 1週目
  { week: 2, target: 11, actual: 12, reflection: 14 }, // 2週目
  { week: 3, target: 15, actual: 16, reflection: 18 }, // 3週目
  { week: 4, target: 19, actual: 20, reflection: 22 }, // 4週目
  { week: 5, target: 23, actual: 24, reflection: 26 }, // 5週目
]

function parseNum(val: string | undefined): number {
  if (!val) return 0
  const n = parseFloat(val.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function detectMonthLabel(cell: string): string | null {
  // "2024.6" → "2024-06" 形式に変換
  const m = cell?.match(/^(\d{4})[./](\d{1,2})$/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}`
}

function detectRowType(cell: string): { type: string; order: number } | null {
  if (!cell) return null
  const s = cell.trim()
  if (s === 'KGI') return { type: 'KGI', order: 1 }
  if (s === 'KPI') return { type: 'KPI', order: 1 }
  const kdi = s.match(/^KDI[①②③④⑤⑥⑦⑧⑨⑩]?(\d*)$/)
  if (kdi) {
    // ①②...⑩を数字に変換
    const circleMap: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10 }
    for (const [c, n] of Object.entries(circleMap)) {
      if (s.includes(c)) return { type: 'KDI', order: n }
    }
    const num = parseInt(kdi[1])
    if (!isNaN(num)) return { type: 'KDI', order: num }
    return { type: 'KDI', order: 1 }
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { spreadsheetId, sheetName, dryRun, fromMonth, toMonth, importProspects } = await req.json()
  if (!spreadsheetId) return NextResponse.json({ error: 'spreadsheetId required' }, { status: 400 })

  // Google Sheets API でデータ取得
  const range = sheetName ? `${sheetName}!A1:AB600` : 'A1:AB600'
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const sheetsRes = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!sheetsRes.ok) {
    const err = await sheetsRes.text()
    return NextResponse.json({ error: `Sheets API error: ${err}` }, { status: sheetsRes.status })
  }

  const sheetsData = await sheetsRes.json()
  const rows: string[][] = sheetsData.values ?? []

  // シートを月ブロックに分割してパース
  interface ParsedEntry {
    year_month: string
    type: string
    order: number
    label: string
    week: number
    target_value: number
    actual_value: number
    reflection: string
  }

  const parsed: ParsedEntry[] = []
  const months: string[] = []

  let currentMonth: string | null = null

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const cellB = row[1] ?? ''

    // 月ヘッダー行を検出
    const month = detectMonthLabel(cellB)
    if (month) {
      currentMonth = month
      if (!months.includes(month)) months.push(month)
      continue
    }

    if (!currentMonth) continue

    // KGI/KPI/KDI行を検出
    const rowType = detectRowType(cellB)
    if (!rowType) continue

    const label = row[2] ?? ''

    for (const wc of WEEK_COLS) {
      parsed.push({
        year_month: currentMonth,
        type: rowType.type,
        order: rowType.order,
        label,
        week: wc.week,
        target_value: parseNum(row[wc.target]),
        actual_value: parseNum(row[wc.actual]),
        reflection: row[wc.reflection] ?? '',
      })
    }
  }

  // KGI月合計振り返りから成約企業を抽出
  interface ProspectEntry {
    year_month: string
    company_name: string
  }
  const prospectEntries: ProspectEntry[] = []
  for (const p of parsed) {
    if (p.type === 'KGI' && p.week === 0 && p.reflection) {
      const names = p.reflection
        .split(/[、,，\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^[（(]/))
      for (const name of names) {
        prospectEntries.push({ year_month: p.year_month, company_name: name })
      }
    }
  }

  // 月フィルタ
  const filteredParsed = parsed.filter((p) => {
    if (fromMonth && p.year_month < fromMonth) return false
    if (toMonth && p.year_month > toMonth) return false
    return true
  })
  const filteredMonths = months.filter((m) => {
    if (fromMonth && m < fromMonth) return false
    if (toMonth && m > toMonth) return false
    return true
  })

  const filteredProspects = prospectEntries.filter((p) => {
    if (fromMonth && p.year_month < fromMonth) return false
    if (toMonth && p.year_month > toMonth) return false
    return true
  })

  if (dryRun) {
    return NextResponse.json({
      months: filteredMonths,
      preview: filteredParsed.slice(0, 30),
      total: filteredParsed.length,
      prospectPreview: filteredProspects.slice(0, 10),
      prospectTotal: filteredProspects.length,
    })
  }

  // DBに保存
  const supabase = createServerSupabase()
  const userEmail = session.user.email

  // goal_templates を取得/更新（フィルタ済みデータを使用）
  const labelsSource = filteredParsed
  const entriesToImport = filteredParsed

  // goal_templates を取得/更新
  const { data: templates } = await supabase
    .from('goal_templates')
    .select('*')
    .eq('user_email', userEmail)

  const templateMap: Record<string, string> = {}
  if (templates) {
    for (const t of templates) {
      templateMap[`${t.type}-${t.order_num}`] = t.id
    }
  }

  // ラベルを更新（フィルタ後の最初の月のデータを使用）
  const firstMonth = filteredMonths[0]
  const labelsToUpdate = labelsSource.filter((p) => p.year_month === firstMonth && p.week === 0)
  for (const item of labelsToUpdate) {
    const key = `${item.type}-${item.order}`
    const tmplId = templateMap[key]
    if (tmplId && item.label) {
      await supabase.from('goal_templates').update({ label: item.label }).eq('id', tmplId)
    }
  }

  // goal_entries をupsert
  let inserted = 0
  const batchSize = 50
  const entries = entriesToImport.map((p) => {
    const key = `${p.type}-${p.order}`
    const template_id = templateMap[key]
    if (!template_id) return null
    return {
      user_email: userEmail,
      template_id,
      year_month: p.year_month,
      week_num: p.week,
      target_value: p.target_value,
      actual_value: p.actual_value,
      reflection: p.reflection,
    }
  }).filter(Boolean)

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const { error } = await supabase
      .from('goal_entries')
      .upsert(batch as never[], { onConflict: 'template_id,year_month,week_num' })
    if (!error) inserted += batch.length
  }

  // 成約企業をprospect_clientsに挿入
  let prospectInserted = 0
  if (importProspects) {
    for (const p of filteredProspects) {
      const { error } = await supabase.from('prospect_clients').insert({
        user_email: userEmail,
        company_name: p.company_name,
        contact_name: '',
        service_content: '',
        status: '成約',
        contracted_at: `${p.year_month}-01`,
        memo: '',
      })
      if (!error) prospectInserted++
    }
  }

  return NextResponse.json({ ok: true, months: filteredMonths, inserted, prospectInserted })
}

// シートの一覧を取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const spreadsheetId = searchParams.get('id')
  if (!spreadsheetId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Sheets API error: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  const sheets = (data.sheets ?? []).map((s: { properties: { title: string; sheetId: number } }) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }))

  return NextResponse.json({ sheets })
}
