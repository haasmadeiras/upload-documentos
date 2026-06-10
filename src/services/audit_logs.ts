import pb from '@/lib/pocketbase/client'

export interface AuditLog {
  id: string
  admin_user: string
  target_user: string
  action: string
  details: Record<string, any>
  created: string
  expand?: {
    admin_user?: { name: string; email: string }
    target_user?: { name: string; email: string }
  }
}

export const getAuditLogs = () =>
  pb
    .collection('audit_logs')
    .getFullList<AuditLog>({ sort: '-created', expand: 'admin_user,target_user' })
