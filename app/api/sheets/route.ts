import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SHEET_ID = '1xv4FAMLL5RRhgmIIbwJEDP1B-pFPIE_Voa7hv805DLQ'

// 改行を含む quoted field に対応した CSV パーサー
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"'; i++
      } else if (ch === '"') {
        inQuote = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuote = true
      } else if (ch === ',') {
        row.push(cur.trim()); cur = ''
      } else if (ch === '\r') {
        // skip
      } else if (ch === '\n') {
        row.push(cur.trim()); cur = ''
        if (row.length > 0) rows.push(row)
        row = []
      } else {
        cur += ch
      }
    }
  }
  if (cur || row.length > 0) {
    row.push(cur.trim())
    if (row.length > 0) rows.push(row)
  }
  return rows
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gid = req.nextUrl.searchParams.get('gid')
  const sheet = req.nextUrl.searchParams.get('sheet')
  const param = sheet
    ? `sheet=${encodeURIComponent(sheet)}`
    : `gid=${gid ?? '0'}`
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&${param}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `シートの取得に失敗しました (${res.status})` }, { status: 502 })

    const text = await res.text()
    if (text.trim().startsWith('<')) {
      return NextResponse.json({ error: 'スプレッドシートへのアクセス権がありません。「リンクを知っている全員が閲覧者」に設定されているか確認してください。' }, { status: 403 })
    }

    const rows = parseCSV(text)
    if (rows.length === 0) return NextResponse.json({ headers: [], rows: [] })

    // ヘッダー行（セル内改行を空白に置換して1行に）
    const headers = rows[0].map(h => h.replace(/\n/g, ' ').replace(/\r/g, ''))
    const data = rows.slice(1).map(row =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    )
    return NextResponse.json({ headers, rows: data })
  } catch (e) {
    console.error('[sheets] fetch error:', e)
    return NextResponse.json({ error: '通信エラーが発生しました' }, { status: 500 })
  }
}
