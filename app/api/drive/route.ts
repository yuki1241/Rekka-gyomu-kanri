import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractFolderId(input: string): string {
  // URL形式: https://drive.google.com/drive/folders/FOLDER_ID
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  // そのままIDとして使用
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
  const folderInput = searchParams.get('folder_id') ?? ''
  if (!folderInput) return NextResponse.json({ files: [] })

  const folderId = extractFolderId(folderInput)

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size)')

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
