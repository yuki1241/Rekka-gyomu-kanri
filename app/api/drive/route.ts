import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractId(input: string): { id: string; isFile: boolean } {
  const folderMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch) return { id: folderMatch[1], isFile: false }
  const fileMatch = input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return { id: fileMatch[1], isFile: true }
  // ?id= 形式
  const idParam = input.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam) return { id: idParam[1], isFile: false }
  return { id: input.trim(), isFile: false }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = (session as { accessToken?: string }).accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'folder'
  const folderInput = searchParams.get('folder_id') ?? 'root'
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime,size,owners,shared)')

  let apiUrl = ''
  let folderName = 'マイドライブ'

  if (view === 'shared') {
    const q = encodeURIComponent('sharedWithMe = true and trashed = false')
    apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=sharedWithMeTime desc&pageSize=100`
    folderName = '共有アイテム'
  } else if (view === 'recent') {
    const q = encodeURIComponent('trashed = false')
    apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=viewedByMeTime desc&pageSize=50`
    folderName = '最近使用したアイテム'
  } else if (view === 'starred') {
    const q = encodeURIComponent('starred = true and trashed = false')
    apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=name&pageSize=100`
    folderName = 'スター付き'
  } else {
    if (folderInput === 'root') {
      const q = encodeURIComponent(`'root' in parents and trashed = false`)
      apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=100`
    } else {
      const { id, isFile } = extractId(folderInput)

      if (isFile) {
        // ファイルURLの場合: そのファイル自体のメタデータを取得して1件で返す
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,webViewLink,modifiedTime,size`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!metaRes.ok) {
          const err = await metaRes.text()
          console.error('[drive] file meta error:', metaRes.status, err.slice(0, 300))
          return NextResponse.json({ error: err, status: metaRes.status }, { status: metaRes.status })
        }
        const file = await metaRes.json()
        return NextResponse.json({ files: [file], folderName: file.name })
      }

      // フォルダURLの場合: フォルダ内ファイルを一覧
      const q = encodeURIComponent(`'${id}' in parents and trashed = false`)
      apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=100`
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (metaRes.ok) {
        const meta = await metaRes.json()
        folderName = meta.name ?? id
      }
    }
  }

  const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (!res.ok) {
    const err = await res.text()
    console.error('[drive] Google API error:', res.status, err.slice(0, 500))
    return NextResponse.json({ error: err, status: res.status }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ ...data, folderName })
}
