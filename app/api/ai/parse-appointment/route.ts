import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })

  const prompt = `
以下は1to1ミーティングの議事録・メモです。
このテキストから以下の情報を抽出してJSON形式で返してください。
情報がない項目は空文字またはnullにしてください。

抽出項目：
- person_name: 相手の名前（フルネーム）
- company_name: 会社名・組織名
- referred_by: 紹介者の名前
- category: 職業カテゴリ（士業/不動産/建設・建築/IT/金融/医療/教育/製造/その他 から最も近いもの）
- keywords: キーワードの配列（最大5個）
- trouble_memo: 相手が困っていること・課題（原文を活かして要約）
- impression_memo: 印象・気づき（原文を活かして要約）
- action_next: 次のアクション
- sale_amount: 売上金額（数字のみ、なければnull）
- status: ステータス（contacted/negotiating/contracted/lost/pending から推測）

必ずJSON形式のみで返してください。説明文は不要です。

議事録・メモ：
${text}
`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    // コードブロック（```json ... ```）が含まれる場合を除去
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    const parsed = JSON.parse(content)
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
