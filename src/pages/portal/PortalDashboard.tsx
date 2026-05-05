import { Link } from 'react-router-dom'
import { UploadCloud, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/portal/CircularProgress'

export default function PortalDashboard() {
  const requiredDocs = [
    { id: 1, name: 'Contrato Social Consolidado', status: 'Aprovado', expires: '-', message: '' },
    {
      id: 2,
      name: 'Certidão Negativa de Débitos (CND)',
      status: 'Em Análise',
      expires: '31/12/2026',
      message: '',
    },
    {
      id: 3,
      name: 'Balanço Patrimonial',
      status: 'Rejeitado',
      expires: '-',
      message: 'Arquivo ilegível, favor re-enviar.',
    },
    { id: 4, name: 'Comprovante Bancário', status: 'Pendente', expires: '-', message: '' },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle2 className="w-4 h-4 mr-1" />
      case 'Rejeitado':
        return <AlertCircle className="w-4 h-4 mr-1" />
      case 'Em Análise':
        return <Clock className="w-4 h-4 mr-1" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-2 py-1">
            <div className="flex items-center">{getStatusIcon(status)} Aprovado</div>
          </Badge>
        )
      case 'Em Análise':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none px-2 py-1">
            <div className="flex items-center">{getStatusIcon(status)} Em Análise</div>
          </Badge>
        )
      case 'Pendente':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none px-2 py-1">
            <div className="flex items-center">{getStatusIcon(status)} Pendente</div>
          </Badge>
        )
      case 'Rejeitado':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none px-2 py-1">
            <div className="flex items-center">{getStatusIcon(status)} Rejeitado</div>
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Status Geral */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <UploadCloud className="w-64 h-64" />
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Olá, Tech Fornecedora</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-base">
              Acompanhe a conformidade do seu cadastro e mantenha seus documentos em dia para
              continuar operando conosco.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <Button variant="secondary" asChild>
              <Link to="/portal/upload">
                <UploadCloud className="w-4 h-4 mr-2" /> Enviar Documentos
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Circular Progress */}
        <Card className="border-none shadow-sm flex flex-col items-center justify-center p-6 text-center">
          <h3 className="font-semibold text-sm text-muted-foreground mb-4">
            Conformidade de Cadastro
          </h3>
          <CircularProgress percentage={75} label="Concluído" />
          <p className="text-xs text-muted-foreground mt-4">1 documento pendente</p>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Exigências</CardTitle>
          <CardDescription>Documentos obrigatórios para o seu perfil comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requiredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-medium">{doc.name}</div>
                    {doc.message && <div className="text-xs text-rose-600 mt-1">{doc.message}</div>}
                  </TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{doc.expires}</TableCell>
                  <TableCell className="text-right">
                    {doc.status !== 'Aprovado' && doc.status !== 'Em Análise' ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/portal/upload?doc=${doc.id}`}>Anexar</Link>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground px-3">Bloqueado</span>
                    )}
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
