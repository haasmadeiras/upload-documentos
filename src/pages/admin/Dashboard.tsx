import { Users, FileWarning, Trees, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    suppliers: 0,
    collaborators: 0,
    pendingDocs: 0,
    forestAreas: 0,
    expiringDocs: 0,
  })

  const [recentDocs, setRecentDocs] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      const [suppliersRes, collabRes, pendingDocsRes, forestRes, docsAllRes] = await Promise.all([
        pb.collection('suppliers').getList(1, 1),
        pb.collection('users').getList(1, 1, { filter: "role = 'Colaborador'" }),
        pb.collection('documents').getList(1, 1, { filter: "status = 'Pending'" }),
        pb.collection('forest_areas').getList(1, 1),
        pb.collection('documents').getFullList({ expand: 'definition' }),
      ])

      const now = new Date()
      const next30Days = new Date()
      next30Days.setDate(now.getDate() + 30)

      let expiringDocsCount = 0
      docsAllRes.forEach((doc) => {
        const validityDays = doc.expand?.definition?.validity_days
        if (validityDays) {
          const expiryDate = new Date(doc.created)
          expiryDate.setDate(expiryDate.getDate() + validityDays)
          if (expiryDate >= now && expiryDate <= next30Days) {
            expiringDocsCount++
          }
        }
      })

      setMetrics({
        suppliers: suppliersRes.totalItems || 0,
        collaborators: collabRes.totalItems || 0,
        pendingDocs: pendingDocsRes.totalItems || 0,
        forestAreas: forestRes.totalItems || 0,
        expiringDocs: expiringDocsCount,
      })
    } catch (error) {
      console.error('Error loading metrics', error)
      setMetrics({
        suppliers: 0,
        collaborators: 0,
        pendingDocs: 0,
        forestAreas: 0,
        expiringDocs: 0,
      })
    }
  }, [])

  const loadActivities = useCallback(async () => {
    try {
      const [docs, logs] = await Promise.all([
        pb.collection('documents').getList(1, 5, { sort: '-created', expand: 'user,supplier' }),
        pb
          .collection('audit_logs')
          .getList(1, 5, { sort: '-created', expand: 'admin_user,target_user' }),
      ])
      setRecentDocs(docs.items || [])
      setRecentLogs(logs.items || [])
    } catch (error) {
      console.error('Error loading activities', error)
      setRecentDocs([])
      setRecentLogs([])
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([loadMetrics(), loadActivities()])
    setIsLoading(false)
  }, [loadMetrics, loadActivities])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('suppliers', () => {
    loadMetrics()
  })
  useRealtime('users', () => {
    loadMetrics()
  })
  useRealtime('forest_areas', () => {
    loadMetrics()
  })
  useRealtime('documents', () => {
    loadMetrics()
    loadActivities()
  })
  useRealtime('audit_logs', () => {
    loadActivities()
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-none">
            Aprovado
          </Badge>
        )
      case 'Pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-none">
            Pendente
          </Badge>
        )
      case 'Solicitar Correção':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100/80 border-none">
            Solicitar Correção
          </Badge>
        )
      case 'Vencido':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-none">
            Vencido
          </Badge>
        )
      case 'Rejected':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-none">
            Rejeitado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
            <p className="text-muted-foreground mt-2">
              Visão geral do sistema e atividades recentes.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/compliance">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Compliance Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fornecedores
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.suppliers}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Colaboradores
            </CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.collaborators}</div>
          </CardContent>
        </Card>
        <Link to="/admin/documents/pending" className="block">
          <Card className="border-none shadow-sm bg-white hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Docs Pendentes
              </CardTitle>
              <FileWarning className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{metrics.pendingDocs}</div>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Áreas Florestais
            </CardTitle>
            <Trees className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.forestAreas}</div>
          </CardContent>
        </Card>
        <Link to="/admin/documents/expiring" className="block">
          <Card className="border-none shadow-sm bg-white hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Docs a Vencer
              </CardTitle>
              <FileWarning className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.expiringDocs}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm bg-white flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documentos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {recentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade recente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>{doc.expand?.user?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(doc.created), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Logs de Auditoria</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/audit-logs">
                Ver Todos <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum log recente.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.expand?.admin_user?.name || 'Sistema'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(log.created), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
