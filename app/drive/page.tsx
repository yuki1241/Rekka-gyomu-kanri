'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  HardDrive, Folder, FileText, ExternalLink,
  ChevronRight, Home, Loader2, AlertCircle, Search, X
} from 'lucide-react'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  modifiedTime: string
  size?: string
}

interface BreadcrumbItem {
  id: string
  name: string
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <Folder size={16} className="text-yellow-500 flex-shrink-0" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <span className="text-sm flex-shrink-0">📊</span>
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <span className="text-sm flex-shrink-0">📝</span>
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <span className="text-sm flex-shrink-0">📊</span>
  }
  if (mimeType.includes('pdf')) return <span className="text-sm flex-shrink-0">📄</span>
  if (mimeType.includes('image')) return <span className="text-sm flex-shrink-0">🖼️</span>
  if (mimeType.includes('video')) return <span className="text-sm flex-shrink-0">🎥</span>
  if (mimeType.includes('audio')) return <span className="text-sm flex-shrink-0">🎵</span>
  return <FileText size={16} className="text-gray-400 flex-shrink-0" />
}

function formatSize(size?: string) {
  if (!size) return ''
  const bytes = parseInt(size)
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentFolder, setCurrentFolder] = useState('root')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'マイドライブ' }
  ])
  const [search, setSearch] = useState('')

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/drive?folder_id=${encodeURIComponent(folderId)}`)
    const data = await res.json()
    if (data.error) {
      setError('ファイルを取得できませんでした。再サインインが必要な場合があります。')
      setFiles([])
    } else {
      setFiles(data.files ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFiles(currentFolder)
  }, [currentFolder, fetchFiles])

  const navigateTo = (folder: DriveFile) => {
    setCurrentFolder(folder.id)
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setSearch('')
  }

  const navigateToBreadcrumb = (item: BreadcrumbItem, index: number) => {
    setCurrentFolder(item.id)
    setBreadcrumbs((prev) => prev.slice(0, index + 1))
    setSearch('')
  }

  const filtered = files.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  const folders = filtered.filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
  const fileItems = filtered.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <HardDrive size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Google Drive</h1>
            <p className="text-gray-500 mt-0.5 text-sm">ファイルを閲覧・管理</p>
          </div>
        </div>

        {/* 検索 */}
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="このフォルダ内を検索"
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* パンくずリスト */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {breadcrumbs.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
            <button
              onClick={() => navigateToBreadcrumb(item, i)}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors ${
                i === breadcrumbs.length - 1
                  ? 'text-gray-900 font-medium bg-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {i === 0 && <Home size={13} />}
              {item.name}
            </button>
          </div>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            読み込み中...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <AlertCircle size={32} className="mb-3 text-red-300" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchFiles(currentFolder)}
              className="mt-3 text-xs text-blue-500 hover:underline"
            >
              再試行
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Folder size={32} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? '検索結果がありません' : 'ファイルがありません'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">名前</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-36">更新日</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-24">サイズ</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {/* フォルダを先に表示 */}
              {folders.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  onClick={() => navigateTo(file)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(file.mimeType)}
                      <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(file.modifiedTime)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                  </td>
                </tr>
              ))}
              {/* ファイルを表示 */}
              {fileItems.map((file, i) => (
                <tr
                  key={file.id}
                  className={`hover:bg-gray-50/70 transition-colors group ${
                    i < fileItems.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(file.mimeType)}
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-800 hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {file.name}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(file.modifiedTime)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatSize(file.size)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink size={13} className="text-gray-400 hover:text-blue-500" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* フッター情報 */}
      {!loading && !error && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {folders.length}個のフォルダ・{fileItems.length}個のファイル
        </p>
      )}
    </div>
  )
}
