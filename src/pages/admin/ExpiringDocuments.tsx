import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { FileWarning, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

interface ExpiringDoc {
  id: string
  title: string
  status: string
  created: string
  expiryDate: Date
  supplierName: string
  definitionName: string
}

export default function AdminExpiringDocuments() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<ExpiringDoc[]>([])
  const [loading, setLoading] = useState(true)

  const isMaster = user?.isAdmin === true || user?.role === 'Admin' || user?.role === 'Colaborador'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

  const fetchExpiringDocs = async () => {
    try {
      const records = await pb.collection('documents').getFullList({
        expand: 'supplier,definition',
        filter: "status != 'Rejected'",
      })

      const now = new Date()
      const next30Days = new Date()
      next30Days.setDate(now.getDate() + 30)

      const expiring: ExpiringDoc[] = []

      records.forEach((doc) => {
        const validityDays = doc.expand?.definition?.validity_days
        if (validityDays) {
          const expiryDate = new Date(doc.created)
          expiryDate.setDate(expiryDate.getDate() + validityDays)

          if (expiryDate >= now && expiryDate <= next30Days) {
            expiring.push({
              id: doc.id,
              title: doc.title || doc.expand?.definition?.name || 'Documento',
              status: doc.status,
              created: doc.created,
              expiryDate,
              supplierName: doc.expand?.supplier?.name || doc.expand?.supplier?.legal_name || 'N/A',
              definitionName: doc.expand?.definition?.name || 'N/A',
            })
          }
        }
      })

      // Sort by expiry date ASC (closest to expire first)
      expiring.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

      setDocuments(expiring)
    } catch (error) {
      console.error('Error fetching expiring documents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      fetchExpiringDocs()
    }
  }, [isMaster])

  useRealtime('documents', () => {
    if (isMaster) {
      fetchExpiringDocs()
    }
  })

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await pb.collection('documents').delete(id)
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      toast.success('Documento excluído com sucesso')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir documento')
    }
  }

  if (!isMaster) return null

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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Docs a Vencer</h1>
          <p className="text-muted-foreground mt-1">
            Documentos que irão expirar nos próximos 30 dias.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileWarning className="w-5 h-5 text-orange-500" />
            <span>Documentos a Vencer (30 dias)</span>
          </CardTitle>
          <CardDescription>
            Lista de documentos organizados pela data de validade mais próxima.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Data de Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando documentos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                    Nenhum documento a vencer encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.supplierName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(doc.created), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-orange-600">
                      {format(doc.expiryDate, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
