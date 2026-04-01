import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractFolderId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return input.trim()
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
    const folderId = folderInput === 'root' ? 'root' : extractFolderId(folderInput)
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
    apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=100`
    if (folderId !== 'root') {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (metaRes.ok) {
        const meta = await metaRes.json()
        folderName = meta.name ?? folderId
      }
    }
  }

  const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ ...data, folderName })
}
