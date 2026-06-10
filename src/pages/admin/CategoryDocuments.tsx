import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getDocuments, deleteDocument, updateDocument } from '@/services/documents'
import { Trash2, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getForestAreas, ForestArea } from '@/services/forest_areas'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function FileViewer({ doc }: { doc: any }) {
  const [url, setUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doc) return
    let isMounted = true
    let objectUrl = ''
    const pbUrl = pb.files.getUrl(doc, doc.file)

    if (doc.file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setUrl(pbUrl)
      setLoading(false)
      return
    }

    fetch(pbUrl)
      .then((r) => r.blob())
      .then((blob) => {
        if (!isMounted) return
        objectUrl = URL.createObjectURL(
          new Blob([blob], { type: doc.file.endsWith('.pdf') ? 'application/pdf' : blob.type }),
        )
        setUrl(objectUrl)
        setLoading(false)
      })
      .catch((e) => {
        console.error('File viewer fetch error:', e)
        if (!isMounted) return
        setUrl(pbUrl) // fallback
        setLoading(false)
      })

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [doc])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Carregando arquivo...</span>
      </div>
    )
  }

  if (doc?.file?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return <img src={url} alt="Documento" className="w-full h-full object-contain" />
  }

  return <iframe src={url} className="w-full h-full border-0" title="Visualização do Documento" />
}

export default function AdminCategoryDocuments() {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedForest, setSelectedForest] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Review Modal State
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const canReview = user?.role === 'Admin' || user?.role === 'Colaborador'

  const loadData = useCallback(async () => {
    try {
      const [docs, sup, forest] = await Promise.all([
        getDocuments('', 'user,forest_area,definition,supplier'),
        pb.collection('users').getFullList({ filter: 'role="Fornecedor"' }),
        getForestAreas(),
      ])
      const categoryDocs = categoryId
        ? docs.filter((d) => d.expand?.definition?.category === categoryId)
        : docs
      setDocuments(categoryDocs)
      setSuppliers(sup)
      setForestAreas(forest)
    } finally {
      setLoading(false)
    }
  }, [categoryId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('documents', loadData)

  // Reset modal state on select
  useEffect(() => {
    if (selectedDoc) {
      setRejectionReason('')
      setShowRejectReason(false)
    }
  }, [selectedDoc])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await deleteDocument(id)
      toast.success('Documento excluído com sucesso')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir documento')
    }
  }

  const handleApprove = async () => {
    if (!selectedDoc) return
    try {
      setActionLoading(true)
      await updateDocument(selectedDoc.id, { status: 'Approved' })
      toast.success('Documento aprovado com sucesso!')
      setSelectedDoc(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao aprovar documento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDoc) return
    if (!rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição')
      return
    }
    try {
      setActionLoading(true)
      await updateDocument(selectedDoc.id, {
        status: 'Rejected',
        rejection_reason: rejectionReason,
      })
      toast.success('Documento rejeitado com sucesso!')
      setSelectedDoc(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao rejeitar documento')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredDocs = documents.filter((d) => {
    const matchSupplier = selectedSupplier === 'all' || d.user === selectedSupplier
    const matchForest = selectedForest === 'all' || d.forest_area === selectedForest
    return matchSupplier && matchForest
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Documentos</h1>
          <p className="text-muted-foreground">Análise, aprovação e controle de requisitos</p>
        </div>

        <div className="flex gap-4 items-center bg-muted/50 p-3 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-xs">Filtrar por Fornecedor</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Filtrar por Área Florestal</Label>
            <Select value={selectedForest} onValueChange={setSelectedForest}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {forestAreas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Área Florestal</TableHead>
              <TableHead>Data de Envio</TableHead>
              <TableHead className="w-[180px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
            {filteredDocs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {doc.title || doc.expand?.definition?.name}
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell>
                  {doc.expand?.supplier?.name ||
                    doc.expand?.user?.name ||
                    doc.expand?.user?.email ||
                    '-'}
                </TableCell>
                <TableCell>{doc.expand?.forest_area?.name || '-'}</TableCell>
                <TableCell>{new Date(doc.created).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {canReview && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Revisar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">Revisão de Documento</DialogTitle>
            <DialogDescription className="text-base font-medium text-foreground">
              {selectedDoc?.title || selectedDoc?.expand?.definition?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Preview Panel */}
            <div className="flex-1 bg-muted/30 border-r relative p-4 h-full flex flex-col">
              <h3 className="text-sm font-medium mb-2 shrink-0">Visualização do Arquivo</h3>
              {selectedDoc && (
                <div className="flex-1 border rounded-md overflow-hidden bg-white relative">
                  <FileViewer doc={selectedDoc} />
                </div>
              )}
            </div>

            {/* Actions & AI Analysis Panel */}
            <div className="w-full md:w-[450px] flex flex-col h-full overflow-y-auto bg-background">
              <div className="p-6 flex-1 space-y-6 flex flex-col">
                <div className="space-y-4 shrink-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm text-muted-foreground mb-1">Status Atual</h4>
                      <StatusBadge status={selectedDoc?.status || ''} />
                    </div>
                    <div>
                      <h4 className="text-sm text-muted-foreground mb-1">Data de Envio</h4>
                      <p className="text-sm font-medium">
                        {selectedDoc ? new Date(selectedDoc.created).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Fornecedor Responsável</h4>
                    <p className="text-sm font-medium">
                      {selectedDoc?.expand?.supplier?.name ||
                        selectedDoc?.expand?.user?.name ||
                        selectedDoc?.expand?.user?.email ||
                        '-'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[200px]">
                  <h4 className="text-sm font-medium mb-2 shrink-0">Análise da IA de Validação</h4>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-md border overflow-y-auto">
                    {selectedDoc?.analysis_log ? (
                      (() => {
                        const log = selectedDoc.analysis_log
                        const statusMap: Record<string, string> = {
                          valid: 'Válido',
                          invalid: 'Inválido',
                        }
                        const status = log.status
                          ? statusMap[log.status.toLowerCase()] || log.status
                          : 'Desconhecido'
                        const extracted = log.extracted || {}

                        return (
                          <div className="space-y-4">
                            <div>
                              <span className="text-muted-foreground text-xs block mb-1">
                                Status da Validação
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
                                    status === 'Válido'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : status === 'Inválido'
                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>
                              {log.reason && (
                                <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded-md border">
                                  {log.reason}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Dados Extraídos
                              </span>
                              <ul className="space-y-2 text-sm">
                                <li className="flex flex-col border-b pb-2">
                                  <span className="text-muted-foreground text-xs">CNPJ</span>
                                  <span className="font-medium">
                                    {extracted.cnpj || 'Não identificado'}
                                  </span>
                                </li>
                                <li className="flex flex-col border-b pb-2">
                                  <span className="text-muted-foreground text-xs">
                                    Data de Emissão
                                  </span>
                                  <span className="font-medium">
                                    {extracted.issuance_date || 'Não identificado'}
                                  </span>
                                </li>
                                <li className="flex flex-col border-b pb-2 border-transparent">
                                  <span className="text-muted-foreground text-xs">
                                    Razão Social
                                  </span>
                                  <span className="font-medium">
                                    {extracted.razao_social || 'Não identificado'}
                                  </span>
                                </li>
                                {Object.entries(extracted).map(([key, value]) => {
                                  if (['cnpj', 'issuance_date', 'razao_social'].includes(key))
                                    return null
                                  const formattedKey = key
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase())
                                  return (
                                    <li key={key} className="flex flex-col border-t pt-2">
                                      <span className="text-muted-foreground text-xs">
                                        {formattedKey}
                                      </span>
                                      <span className="font-medium">
                                        {value ? String(value) : 'Não identificado'}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Nenhuma análise disponível.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t shrink-0 mt-auto">
                  {showRejectReason ? (
                    <div className="space-y-3 animate-fade-in-up">
                      <Label className="text-destructive font-medium">Motivo da Rejeição</Label>
                      <textarea
                        placeholder="Descreva claramente o motivo da rejeição para orientar o fornecedor..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowRejectReason(false)}
                          disabled={actionLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={handleReject}
                          disabled={actionLoading}
                        >
                          Confirmar Rejeição
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setShowRejectReason(true)}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                      </Button>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
