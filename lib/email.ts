import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' }

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendTaskAssignedEmail(params: {
  to: string
  taskTitle: string
  taskDescription?: string | null
  dueDate?: string | null
  priority?: string | null
  fromName: string
}) {
  const { to, taskTitle, taskDescription, dueDate, priority, fromName } = params
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to,
      subject: `【Rekka Portal】新しいタスクが依頼されました: ${taskTitle}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
            <div style="width: 36px; height: 36px; background: #e85d04; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #fff; font-size: 18px;">🔥</span>
            </div>
            <div>
              <p style="margin: 0; font-size: 15px; font-weight: bold; color: #1a1a1a;">Rekka Portal</p>
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Business System</p>
            </div>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #1a1a1a;">新しいタスクが依頼されました</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #666;"><strong>${escapeHtml(fromName)}</strong>さんから新しいタスクが届いています。</p>
          <div style="background: #fef3e2; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #1a1a1a;">${escapeHtml(taskTitle)}</p>
            ${taskDescription ? `<p style="margin: 0 0 8px; font-size: 13px; color: #666;">${escapeHtml(taskDescription)}</p>` : ''}
            ${dueDate ? `<p style="margin: 0; font-size: 12px; color: #e85d04; font-weight: 600;">期限: ${dueDate}</p>` : ''}
            ${priority ? `<p style="margin: 4px 0 0; font-size: 12px; color: #999;">優先度: ${priorityLabel[priority] ?? priority}</p>` : ''}
          </div>
          <a href="${appUrl}/tasks" style="display: inline-block; background: #e85d04; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">タスクを確認する</a>
          <p style="margin: 24px 0 0; font-size: 12px; color: #aaa;">Rekka Portal からの通知メールです</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('タスク依頼メール送信エラー:', err)
  }
}
