import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

function parseNum(val: string | undefined): number {
  if (!val) return 0
  const n = parseFloat(val.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

interface ParsedCompany {
  number: number | null
  company_name: string
  sales_person: string
  notes: string
  items: { id: string; name: string; quantity: number; unit_price: number; amount: number }[]
  total_amount: number
  assistant_raw: string
  director_raw: string
}

/**
 * スプレッドシートの構造:
 * A: 番号
 * B: 会社名
 * C: 営業担当
 * D: 補足情報（メール・連絡先など）
 * E: 請求項目（会社行は空、続く行が各項目）
 * F: 数量
 * G: 単価(税抜)
 * H: 請求金額(税抜)
 * N列付近: アシスタント情報
 * S列付近: ディレクター情報
 *
 * 会社行の識別: A列に数字がある行 or B列に会社名が入っている行
 * 項目行の識別: A列が空でE列に内容がある行
 */
function parseSheet(rows: string[][]): ParsedCompany[] {
  const companies: ParsedCompany[] = []
  let current: ParsedCompany | null = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const colA = (row[0] ?? '').trim()
    const colB = (row[1] ?? '').trim()
    const colC = (row[2] ?? '').trim()
    const colD = (row[3] ?? '').trim()
    const colE = (row[4] ?? '').trim()
    const colF = row[5] ?? ''
    const colG = row[6] ?? ''
    const colH = row[7] ?? ''

    // セクションヘッダー行をスキップ（「原案件」「久保田案件」など）
    if (colB && !colA && !colE && colB.includes('案件')) continue
    if (colB && !colA && !colE && colB.includes('@')) continue
    if (colB === '会社名') continue // ヘッダー行スキップ

    // 会社行の判定：A列が数字 or A列が空でB列に会社名がある（新しい会社ブロック開始）
    const isCompanyRow = /^\d+$/.test(colA) || (colA === '' && colB && !colE && colB.length > 1)

    if (isCompanyRow && colB) {
      // 前の会社を保存
      if (current) companies.push(current)

      // アシスタント・ディレクター情報（列N=13, S=18付近）
      const assistantRaw = row[13] ?? ''
      const directorRaw = row[18] ?? row[19] ?? ''

      current = {
        number: /^\d+$/.test(colA) ? parseInt(colA) : null,
        company_name: colB,
        sales_person: colC,
        notes: colD,
        items: [],
        total_amount: 0,
        assistant_raw: assistantRaw,
        director_raw: directorRaw,
      }
      // 同行に項目がある場合
      if (colE) {
        const qty = parseNum(colF)
        const price = parseNum(colG)
        const amt = parseNum(colH) || qty * price
        current.items.push({
          id: crypto.randomUUID(),
          name: colE,
          quantity: qty || 1,
          unit_price: price,
          amount: amt,
        })
      }
      continue
    }

    // 項目行の判定：現在の会社が存在し、E列に内容がある
    if (current && colE && !isCompanyRow) {
      const qty = parseNum(colF)
      const price = parseNum(colG)
      const amt = parseNum(colH) || qty * price
      current.items.push({
        id: crypto.randomUUID(),
        name: colE,
        quantity: qty || 1,
        unit_price: price,
        amount: amt,
      })
      // アシスタント情報の補完（後続行にある場合）
      const assistantRaw = row[13] ?? ''
      if (assistantRaw && !current.assistant_raw) current.assistant_raw = assistantRaw
      const directorRaw = row[18] ?? row[19] ?? ''
      if (directorRaw && !current.director_raw) current.director_raw = directorRaw
    }

    // 合計行（「合計（税抜）」など）をスキップしつつ次の会社に備える
    if (colD && colD.includes('合計') && !colB) {
      if (current) {
        current.total_amount = parseNum(row[7])
      }
    }
  }

  if (current) companies.push(current)

  // 合計金額を集計
  for (const c of companies) {
    if (!c.total_amount) {
      c.total_amount = c.items.reduce((s, i) => s + i.amount, 0)
    }
  }

  return companies.filter((c) => c.company_name)
}

/**
 * "山田太郎 ¥50,000" や "山田 50000" 形式をパース
 */
function parseNameAmount(raw: string): { name: string; amount: number } {
  const cleaned = raw.trim()
  // 金額パターン: ¥xxx,xxx or 数字
  const amtMatch = cleaned.match(/[¥￥]?([\d,]+)/)
  const amount = amtMatch ? parseNum(amtMatch[1]) : 0
  const name = cleaned.replace(/[¥￥]?[\d,]+/, '').replace(/\s+/g, ' ').trim()
  return { name, amount }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { spreadsheetId, sheetName, month, dryRun } = await req.json()
  if (!spreadsheetId || !month) {
    return NextResponse.json({ error: 'spreadsheetId and month are required' }, { status: 400 })
  }

  // Google Sheets API でデータ取得
  const range = sheetName ? `${encodeURIComponent(sheetName)}!A1:Z200` : 'A1:Z200'
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
  const sheetsRes = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!sheetsRes.ok) {
    const err = await sheetsRes.text()
    return NextResponse.json({ error: `Sheets API error: ${err}` }, { status: sheetsRes.status })
  }

  const sheetsData = await sheetsRes.json()
  const rows: string[][] = sheetsData.values ?? []

  const companies = parseSheet(rows)

  if (dryRun) {
    return NextResponse.json({ preview: companies.slice(0, 10), total: companies.length })
  }

  // DBに保存
  const supabase = createServerSupabase()
  const userEmail = session.user.email

  // 既存の会社名リストを取得（重複防止）
  const { data: existing } = await supabase
    .from('invoice_records')
    .select('company_name')
    .eq('month', month)
    .eq('user_email', userEmail)
  const existingNames = new Set((existing ?? []).map((r: { company_name: string }) => r.company_name))

  // 今月の最大番号
  const { data: maxRecord } = await supabase
    .from('invoice_records')
    .select('number')
    .eq('month', month)
    .eq('user_email', userEmail)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = (maxRecord?.number ?? 0) + 1
  let inserted = 0
  let skipped = 0

  for (const company of companies) {
    if (existingNames.has(company.company_name)) {
      skipped++
      continue
    }

    // アシスタント情報のパース（最大5名）
    const assistants: { name: string; amount: number }[] = []
    if (company.assistant_raw) {
      // 複数名が改行や「、」で区切られている場合を考慮
      const parts = company.assistant_raw.split(/[\n、,，]+/).filter((s) => s.trim())
      for (const part of parts.slice(0, 5)) {
        const parsed = parseNameAmount(part)
        if (parsed.name || parsed.amount) assistants.push(parsed)
      }
    }
    // 5件未満なら空で補完
    while (assistants.length < 5) assistants.push({ name: '', amount: 0 })

    // ディレクター情報のパース
    const dirParsed = company.director_raw ? parseNameAmount(company.director_raw) : { name: '', amount: 0 }

    const { error } = await supabase.from('invoice_records').insert({
      month,
      user_email: userEmail,
      number: company.number ?? nextNumber,
      company_name: company.company_name,
      sales_person: company.sales_person,
      notes: company.notes,
      items: company.items,
      total_amount: company.total_amount,
      status: '入力未完了',
      is_recurring: false,
      assistants,
      director_name: dirParsed.name,
      director_amount: dirParsed.amount,
      updated_at: new Date().toISOString(),
    })

    if (!error) {
      inserted++
      nextNumber++
    }
  }

  return NextResponse.json({ ok: true, inserted, skipped, total: companies.length })
}

// シート一覧を取得
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
