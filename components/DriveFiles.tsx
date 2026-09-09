'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, FileText, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  iconLink: string
  modifiedTime: string
  size?: string
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return '📁'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('video')) return '🎥'
  if (mimeType.includes('audio')) return '🎵'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️'
  return '📄'
}

function formatSize(size?: string) {
  if (!size) return ''
  const bytes = parseInt(size)
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

interface Props {
  folderId: string
  rawUrl?: string
}

export default function DriveFiles({ folderId, rawUrl }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!folderId.trim()) return
    setLoading(true)
    setError('')
    fetch(`/api/drive?folder_id=${encodeURIComponent(folderId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          // APIで取得できない場合でもURLは保存済みなので、リンクとして表示
          setFiles([])
          setError('fallback')
        } else {
          setFiles(data.files ?? [])
        }
      })
      .catch(() => setError('通信エラーが発生しました'))
      .finally(() => setLoading(false))
  }, [folderId])

  if (!folderId.trim()) return null

  return (
    <div className="mt-2">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <Loader2 size={12} className="animate-spin" />
          読み込み中...
        </div>
      )}
      {error === 'fallback' && (
        <a
          href={rawUrl || `https://drive.google.com/drive/folders/${folderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group text-xs text-gray-600"
        >
          <span className="text-sm">📁</span>
          <span className="flex-1 truncate group-hover:text-blue-600">Google Drive で開く</span>
          <ExternalLink size={10} className="text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
        </a>
      )}
      {!loading && !error && files.length === 0 && (
        <p className="text-xs text-gray-400 py-2">ファイルがありません</p>
      )}
      {!loading && files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <a
              key={file.id}
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-sm flex-shrink-0">{getFileIcon(file.mimeType)}</span>
              <span className="text-xs text-gray-700 flex-1 truncate group-hover:text-blue-600">
                {file.name}
              </span>
              {file.size && (
                <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(file.size)}</span>
              )}
              <ExternalLink size={10} className="text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
