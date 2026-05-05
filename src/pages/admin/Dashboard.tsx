import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AdminDashboard() {
  const { uploads } = useApp()

  const stats = [
    {
      title: 'Stakeholders Ativos',
      value: '142',
      icon: Users,
      desc: '+4 este mês',
      color: 'text-blue-500',
    },
    {
      title: 'Docs em Análise',
      value: uploads.filter((u) => u.status === 'Em Análise').length.toString(),
      icon: FileText,
      desc: 'Requerem atenção',
      color: 'text-amber-500',
    },
    {
      title: 'Docs Rejeitados',
      value: uploads.filter((u) => u.status === 'Rejeitado').length.toString(),
      icon: AlertTriangle,
      desc: 'Aguardando reenvio',
      color: 'text-rose-500',
    },
    {
      title: 'Aprovações Recentes',
      value: '28',
      icon: CheckCircle,
      desc: 'Nos últimos 7 dias',
      color: 'text-emerald-500',
    },
  ]

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'default'
      case 'Em Análise':
        return 'secondary'
      case 'Rejeitado':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Global</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do compliance de fornecedores e parceiros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimos documentos enviados pelos stakeholders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">
                    {upload.fileName || `Documento ${upload.id}`}
                  </TableCell>
                  <TableCell>Tech Solutions LTDA</TableCell>
                  <TableCell>
                    {new Date(upload.uploadDate || '').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getBadgeVariant(upload.status)}
                      className={
                        upload.status === 'Em Análise'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
                          : upload.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'
                            : ''
                      }
                    >
                      {upload.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {uploads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nenhuma atividade recente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
