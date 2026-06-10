import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileWarning, Loader2, ArrowLeft, Check, X, Eye } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/StatusBadge'

export default function AdminPendingDocuments() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const isMaster = user?.isAdmin === true || user?.role === 'Admin' || user?.role === 'Colaborador'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

  const fetchPendingDocs = async () => {
    try {
      const records = await pb.collection('documents').getFullList({
        filter: "status = 'Pending' || status = 'Pending Final Approval'",
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

  useEffect(() => {
    if (isMaster) {
      fetchPendingDocs()
    }
  }, [isMaster])

  useRealtime('documents', () => {
    if (isMaster) fetchPendingDocs()
  })

  const handleApprove = async (doc: any) => {
    try {
      await pb.collection('documents').update(doc.id, { status: 'Approved' })
      toast.success('Documento aprovado com sucesso!')
      setSelectedDoc(null)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao aprovar documento')
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    try {
      await pb.collection('documents').update(selectedDoc.id, {
        status: 'Rejected',
        rejection_reason: rejectionReason,
      })
      toast.success('Documento rejeitado com sucesso!')
      setIsRejectOpen(false)
      setSelectedDoc(null)
      setRejectionReason('')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao rejeitar documento')
    }
  }

  if (!isMaster) return null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Revisão Manual</h1>
          <p className="text-muted-foreground mt-1">
            Aprove ou rejeite documentos processados pela IA.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileWarning className="w-5 h-5 text-amber-500" />
            <span>Documentos Pendentes</span>
          </CardTitle>
          <CardDescription>
            Documentos aguardando análise da IA ou aprovação final humana.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando...</span>
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
                      {doc.title || doc.expand?.definition?.name || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      {doc.expand?.supplier?.name || doc.expand?.supplier?.legal_name || 'N/A'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(doc.created), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-4 h-4 mr-2" /> Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDoc} onOpenChange={(o) => !o && setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisão de Documento</DialogTitle>
            <DialogDescription>
              Confira o resultado da análise da IA e decida a aprovação.
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold block text-muted-foreground">Fornecedor</span>
                  {selectedDoc.expand?.supplier?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Documento</span>
                  {selectedDoc.title || selectedDoc.expand?.definition?.name}
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Status Atual</span>
                  <StatusBadge status={selectedDoc.status} />
                </div>
                <div>
                  <span className="font-semibold block text-muted-foreground">Arquivo</span>
                  <a
                    href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/documents/${selectedDoc.id}/${selectedDoc.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver Arquivo Original
                  </a>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md border text-sm">
                <span className="font-semibold text-slate-700 block mb-2">
                  Log de Análise da IA
                </span>
                {selectedDoc.analysis_log ? (
                  <pre className="whitespace-pre-wrap text-slate-600 font-mono text-xs">
                    {typeof selectedDoc.analysis_log === 'object'
                      ? JSON.stringify(selectedDoc.analysis_log, null, 2)
                      : selectedDoc.analysis_log}
                  </pre>
                ) : (
                  <span className="text-muted-foreground italic">
                    Nenhum log disponível (ainda em processamento ou falhou).
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setIsRejectOpen(true)}>
              <X className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
            <Button onClick={() => handleApprove(selectedDoc)}>
              <Check className="w-4 h-4 mr-2" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição para o fornecedor.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: CNPJ Divergente, Documento Ilegível..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
