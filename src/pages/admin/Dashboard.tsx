import { Users, FileWarning, Clock, ArrowRight, Loader2 } from 'lucide-react'
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
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial data fetching
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const recentActivities = [
    {
      id: 1,
      stakeholder: 'Tech Solutions LTDA',
      doc: 'Contrato Social',
      status: 'Em Análise',
      date: 'Hoje, 10:42',
    },
    {
      id: 2,
      stakeholder: 'Serviços Gerais S.A',
      doc: 'Certidão Negativa',
      status: 'Pendente',
      date: 'Hoje, 09:15',
    },
    {
      id: 3,
      stakeholder: 'Inovação TI',
      doc: 'Comprovante Bancário',
      status: 'Aprovado',
      date: 'Ontem, 16:30',
    },
    {
      id: 4,
      stakeholder: 'Consultoria Alpha',
      doc: 'Balanço Patrimonial',
      status: 'Rejeitado',
      date: 'Ontem, 14:20',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-none">
            Aprovado
          </Badge>
        )
      case 'Em Análise':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-none">
            Em Análise
          </Badge>
        )
      case 'Pendente':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-none">
            Pendente
          </Badge>
        )
      case 'Rejeitado':
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-2">Visão geral do sistema e atividades recentes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stakeholders
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-emerald-600 mt-1">+12 no último mês</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos p/ Revisão
            </CardTitle>
            <FileWarning className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">43</div>
            <p className="text-xs text-muted-foreground mt-1">Ação requerida na fila</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencendo em 30 dias
            </CardTitle>
            <Clock className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">18</div>
            <p className="text-xs text-muted-foreground mt-1">Alertas enviados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Atividade Recente de Stakeholders</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/suppliers">
              Ver Todos <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.stakeholder}</TableCell>
                  <TableCell>{activity.doc}</TableCell>
                  <TableCell className="text-muted-foreground">{activity.date}</TableCell>
                  <TableCell>{getStatusBadge(activity.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
