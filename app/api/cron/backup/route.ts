import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { uploadJsonToDrive } from '@/lib/google-drive-backup'

const TABLES = [
  'app_users',
  'appointments',
  'tasks',
  'projects',
  'expenses',
  'prospects',
  'contacts',
  'goals',
  'goal_templates',
  'goal_entries',
  'invoices',
  'suggestions',
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
  if (!folderId) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID not set' }, { status: 500 })
  }

  const supabase = createServerSupabase()
  const backup: Record<string, unknown[]> = {}
  const errors: string[] = []

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      errors.push(`${table}: ${error.message}`)
    } else {
      backup[table] = data ?? []
    }
  }

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `rekka-portal-backup-${yearMonth}.json`
  const content = JSON.stringify({ backup_at: now.toISOString(), errors, data: backup }, null, 2)

  try {
    const fileId = await uploadJsonToDrive(content, fileName, folderId)
    return NextResponse.json({ success: true, fileName, fileId, errors })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
