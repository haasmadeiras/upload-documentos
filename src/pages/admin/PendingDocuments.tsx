import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileWarning, Loader2, ArrowLeft, Check, X, Eye, ZoomIn, ZoomOut } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'

export default function AdminPendingDocuments() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const [zoom, setZoom] = useState(1)
  const [manualData, setManualData] = useState({
    cnpj: '',
    razao_social: '',
    issuance_date: '',
  })

  const isMaster = user?.isAdmin === true || user?.role === 'Admin' || user?.role === 'Colaborador'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

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

  useEffect(() => {
    if (isMaster) {
      fetchPendingDocs()
    }
  }, [isMaster])

  useRealtime('documents', () => {
    if (isMaster) fetchPendingDocs()
  })

  useEffect(() => {
    if (selectedDoc) {
      setZoom(1)
      const ex = selectedDoc.analysis_log?.extracted || {}
      setManualData({
        cnpj: ex.cnpj || '',
        razao_social: ex.razao_social || '',
        issuance_date: ex.issuance_date || '',
      })
    }
  }, [selectedDoc])

  const handleApprove = async (doc: any) => {
    try {
      const currentLog = doc.analysis_log || {}
      const updatedLog = {
        ...currentLog,
        extracted: {
          ...currentLog.extracted,
          ...manualData,
        },
      }

      await pb.collection('documents').update(doc.id, {
        status: 'Approved',
        analysis_log: updatedLog,
      })
      toast.success('Documento aprovado com sucesso!')
      setSelectedDoc(null)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao aprovar documento')
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo')
      return
    }
    try {
      await pb.collection('documents').update(selectedDoc.id, {
        status: 'Solicitar Correção',
        rejection_reason: rejectionReason,
      })
      toast.success('Correção solicitada com sucesso!')
      setIsRejectOpen(false)
      setSelectedDoc(null)
      setRejectionReason('')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao rejeitar documento')
    }
  }

  const isUnidentified = (val: string) =>
    !val || val.toLowerCase() === 'não identificado' || val.toLowerCase() === 'null'

  const renderField = (label: string, field: keyof typeof manualData) => {
    const value = manualData[field]
    const originalValue = selectedDoc?.analysis_log?.extracted?.[field]
    const needsManual = isUnidentified(originalValue)

    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        {needsManual ? (
          <Input
            value={value}
            onChange={(e) => setManualData((prev) => ({ ...prev, [field]: e.target.value }))}
            className="h-8 text-sm"
            placeholder="Digite manualmente..."
          />
        ) : (
          <div className="text-sm font-medium bg-slate-50 p-2 rounded-md border border-slate-100">
            {value}
          </div>
        )}
      </div>
    )
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
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>Revisão de Documento</DialogTitle>
            <DialogDescription>Confira o documento e os dados extraídos pela IA.</DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 p-6 pt-0">
              <div className="flex-1 relative border rounded-lg bg-slate-200/50 overflow-hidden flex flex-col shadow-inner">
                <div className="absolute bottom-4 right-4 z-10 flex bg-white/95 backdrop-blur-sm shadow border rounded-lg p-1 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center px-2 text-xs font-medium min-w-[3rem] justify-center">
                    {Math.round(zoom * 100)}%
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex justify-center">
                  <div className="min-w-fit min-h-fit flex items-start justify-center">
                    <img
                      src={pb.files.getUrl(selectedDoc, selectedDoc.file, { thumb: '1000x0' })}
                      alt="Document Preview"
                      style={{
                        width: `${zoom * 100}%`,
                        minWidth: `${zoom * 50}vw`,
                        transition:
                          'width 0.2s cubic-bezier(0.2, 0, 0, 1), min-width 0.2s cubic-bezier(0.2, 0, 0, 1)',
                      }}
                      className="max-w-none h-auto bg-white rounded shadow-md object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[350px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Informações do Fornecedor</h3>
                    <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          Nome / Razão Social
                        </span>
                        {selectedDoc.expand?.supplier?.name || 'N/A'}
                      </div>
                      <div className="pt-2">
                        <span className="text-muted-foreground block text-xs">Documento</span>
                        {selectedDoc.title || selectedDoc.expand?.definition?.name}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Resumo da Análise</h3>
                    <div className="space-y-4">
                      {renderField('CNPJ', 'cnpj')}
                      {renderField('Razão Social', 'razao_social')}
                      {renderField('Data de Emissão', 'issuance_date')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-4 shrink-0 border-t bg-slate-50/50">
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setSelectedDoc(null)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => setIsRejectOpen(true)}>
                  <X className="w-4 h-4 mr-2" /> Solicitar Correção
                </Button>
                <Button
                  onClick={() => handleApprove(selectedDoc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" /> Aprovar
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Correção</DialogTitle>
            <DialogDescription>
              Informe o motivo para que o fornecedor corrija o documento.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: CNPJ Divergente, Documento Ilegível..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirmar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
