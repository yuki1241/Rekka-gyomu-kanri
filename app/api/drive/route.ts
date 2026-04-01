import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export function extractFolderId(input: string): string {
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
  const folderInput = searchParams.get('folder_id') ?? 'root'
  const folderId = folderInput === 'root' ? 'root' : extractFolderId(folderInput)

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime,size),nextPageToken')

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=folder,name&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()

  // フォルダ名も取得（rootでない場合）
  let folderName = 'マイドライブ'
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

  return NextResponse.json({ ...data, folderName, folderId })
}
