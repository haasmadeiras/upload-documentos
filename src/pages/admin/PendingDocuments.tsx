import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  FileWarning,
  Loader2,
  ArrowLeft,
  Check,
  X,
  Eye,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  Maximize,
} from 'lucide-react'

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
    expiration_date: '',
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
        filter: "status = 'Pending' || status = 'Aguardando Aprovação'",
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
        expiration_date: ex.expiration_date || ex.issuance_date || '',
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

  const isUnidentified = (val: string) =>
    !val ||
    val.toLowerCase() === 'não identificado' ||
    val.toLowerCase() === 'null' ||
    val === 'n/a'

  const renderField = (label: string, field: keyof typeof manualData) => {
    const value = manualData[field]
    const originalValue = selectedDoc?.analysis_log?.extracted?.[field]
    const needsManual = isUnidentified(originalValue)

    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground block">{label}</label>
        {needsManual ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center text-amber-600 text-[11px] font-medium leading-none">
              <FileWarning className="w-3 h-3 mr-1" />
              Não identificado (Preenchimento Manual)
            </div>
            <Input
              value={value}
              onChange={(e) => setManualData((prev) => ({ ...prev, [field]: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Digite manualmente..."
            />
          </div>
        ) : (
          <div className="text-sm font-medium bg-slate-50 p-2 rounded-md border border-slate-100 break-words">
            {value}
          </div>
        )}
      </div>
    )
  }

  const fileUrl = selectedDoc ? pb.files.getUrl(selectedDoc, selectedDoc.file) : ''
  const isPdf = selectedDoc?.file?.toLowerCase().endsWith('.pdf')
  const aiStatus = selectedDoc?.analysis_log?.status || 'Pending'

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
        <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-4 shrink-0 border-b bg-white">
            <DialogTitle className="text-xl font-bold">Revisão de Documento</DialogTitle>
            <DialogDescription className="text-base text-foreground mt-1">
              Upload: {selectedDoc?.title || selectedDoc?.expand?.definition?.name || 'Sem nome'}
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
              {/* Left Panel: PDF Viewer */}
              <div className="flex-1 flex flex-col min-w-0 bg-white rounded-md border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b bg-slate-50 shrink-0">
                  <span className="text-sm font-semibold ml-2">Visualização do Arquivo</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" /> Abrir em Nova Aba
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <a href={fileUrl} download>
                        <Download className="w-3.5 h-3.5 mr-2" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex-1 relative overflow-auto bg-slate-100 flex p-4">
                  <div className="absolute top-4 right-4 z-10 flex items-center bg-white border shadow-sm rounded-md overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-slate-100"
                      onClick={() => setZoom((z) => Math.max(z - 0.1, 0.1))}
                    >
                      <ZoomOut className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-slate-100 border-x"
                      onClick={() => setZoom(1)}
                    >
                      <Maximize className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-slate-100"
                      onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                    >
                      <ZoomIn className="w-4 h-4 text-slate-600" />
                    </Button>
                  </div>

                  <div className="m-auto flex items-center justify-center min-h-full min-w-full">
                    {isPdf ? (
                      <div
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top center',
                          transition: 'transform 0.2s ease-in-out',
                          width: '100%',
                          minHeight: '800px',
                        }}
                      >
                        <iframe
                          src={`${fileUrl}#view=FitH`}
                          className="w-full h-full min-h-[800px] border border-slate-300 bg-white shadow-sm rounded-sm"
                        />
                      </div>
                    ) : (
                      <img
                        src={pb.files.getUrl(selectedDoc, selectedDoc.file)}
                        alt="Document Preview"
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center',
                          transition: 'transform 0.2s ease-in-out',
                        }}
                        className="bg-white rounded-sm shadow-sm border border-slate-300 max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Analysis Sidebar */}
              <div className="w-full lg:w-[320px] shrink-0 flex flex-col overflow-y-auto bg-white border rounded-md shadow-sm">
                <div className="p-4 space-y-5 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block mb-1">
                        Status Atual
                      </span>
                      <StatusBadge status={selectedDoc.status} />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block mb-1">
                        Data de Envio
                      </span>
                      <span className="text-sm">
                        {format(new Date(selectedDoc.created), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-medium block mb-1">
                      Fornecedor Responsável
                    </span>
                    <span className="text-sm font-bold block leading-tight">
                      {selectedDoc.expand?.supplier?.legal_name ||
                        selectedDoc.expand?.supplier?.name ||
                        'N/A'}
                    </span>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div>
                    <h3 className="text-base font-bold mb-4">Análise da IA de Validação</h3>

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block mb-1">
                          Status da Validação
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            aiStatus?.toLowerCase() === 'rejected'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : aiStatus?.toLowerCase() === 'approved'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {aiStatus}
                        </span>
                      </div>

                      <div className="pt-2">
                        <span className="text-sm font-bold block mb-3 text-slate-800">
                          Resumo da Análise
                        </span>
                        <div className="space-y-4 bg-white">
                          {renderField('CNPJ', 'cnpj')}
                          {renderField('Data de Validade', 'expiration_date')}
                          {renderField('Razão Social', 'razao_social')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-slate-50 shrink-0 flex flex-col gap-2">
                  <Button
                    onClick={() => handleApprove(selectedDoc)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aprovar Documento
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsRejectOpen(true)}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" /> Rejeitar Documento
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
            <DialogDescription>
              Informe o motivo ou orientação para rejeitar o documento.
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
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
