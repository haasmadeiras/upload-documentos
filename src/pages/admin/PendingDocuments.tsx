import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { FileWarning, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import pb from '@/lib/pocketbase/client'
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

export default function AdminPendingDocuments() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isMaster = user?.isAdmin === true || user?.role === 'Admin' || user?.role === 'Colaborador'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

  useEffect(() => {
    const fetchPendingDocs = async () => {
      try {
        const records = await pb.collection('documents').getFullList({
          filter: "status = 'Pending'",
          expand: 'supplier,definition,user',
          sort: '-created',
        })
        setDocuments(records)
      } catch (error) {
        console.error('Error fetching pending documents:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isMaster) {
      fetchPendingDocs()
    }
  }, [isMaster])

  if (!isMaster) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Docs Pendentes</h1>
          <p className="text-muted-foreground mt-1">Lista de documentos aguardando análise.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileWarning className="w-5 h-5 text-amber-500" />
            <span>Documentos Pendentes</span>
          </CardTitle>
          <CardDescription>
            Documentos enviados por fornecedores e colaboradores com status pendente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando documentos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                    Nenhum documento pendente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {doc.title || doc.expand?.definition?.name || 'Documento sem nome'}
                    </TableCell>
                    <TableCell>
                      {doc.expand?.supplier?.name || doc.expand?.supplier?.legal_name || 'N/A'}
                    </TableCell>
                    <TableCell>{doc.expand?.user?.name || 'N/A'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(doc.created), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-none">
                        Pendente
                      </Badge>
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
