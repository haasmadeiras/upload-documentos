import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getAuditLogs, AuditLog } from '@/services/audit_logs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default function AdminAuditLogs() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const isMaster = user?.isAdmin === true || user?.role === 'Admin'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const data = await getAuditLogs()
      setLogs(data)
    } catch (error) {
      toast.error('Erro ao carregar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      fetchLogs()
    }
  }, [isMaster])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Status Change':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Status
          </Badge>
        )
      case 'Update':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Update
          </Badge>
        )
      case 'Delete':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
            Delete
          </Badge>
        )
      case 'Create':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
            Create
          </Badge>
        )
      default:
        return <Badge variant="secondary">{action}</Badge>
    }
  }

  if (!isMaster) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>
            Histórico de alterações realizadas em usuários do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário Afetado</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {log.expand?.admin_user?.name || 'SISTEMA'}
                      {log.expand?.admin_user?.email && (
                        <div className="text-xs text-muted-foreground">
                          {log.expand?.admin_user?.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.expand?.target_user?.name || 'Excluído'}
                      <div className="text-xs text-muted-foreground">
                        {log.expand?.target_user?.email || log.details?.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate">
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
