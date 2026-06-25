import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  getDocuments,
  deleteDocument,
  updateDocument,
  downloadDocument,
} from '@/services/documents'
import {
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function PdfViewer({ url, scale }: { url: string; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  const [pdfPage, setPdfPage] = useState<any>(null)

  useEffect(() => {
    let active = true
    async function loadPdf() {
      try {
        setError(false)
        const loadingTask = pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        if (active) setPdfPage(page)
      } catch (err) {
        console.error('Error rendering PDF:', err)
        if (active) setError(true)
      }
    }
    loadPdf()
    return () => {
      active = false
    }
  }, [url])

  useEffect(() => {
    if (!pdfPage || !canvasRef.current) return
    let renderTask: any = null
    const render = async () => {
      try {
        const viewport = pdfPage.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        renderTask = pdfPage.render(renderContext)
        await renderTask.promise
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(err)
        }
      }
    }
    render()
    return () => {
      if (renderTask) renderTask.cancel()
    }
  }, [pdfPage])
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-sm text-destructive mb-2 font-medium">Erro ao renderizar prévia.</p>
        <p className="text-xs text-muted-foreground">
          Por favor, utilize o botão de Download abaixo.
        </p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="shadow-md bg-white transition-transform duration-200 ease-in-out"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
    />
  )
}

function FileViewer({ doc }: { doc: any }) {
  const [url, setUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    async function loadUrl() {
      if (!doc) return
      setLoading(true)
      setScale(1)
      try {
        const token = await pb.files.getToken()
        setUrl(pb.files.getUrl(doc, doc.file, { token }))
      } catch (err) {
        console.error('Error getting file token', err)
        setUrl(pb.files.getUrl(doc, doc.file))
      } finally {
        setLoading(false)
      }
    }
    loadUrl()
  }, [doc])

  if (loading || !url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Carregando arquivo...</span>
      </div>
    )
  }

  const isImage = !!doc?.file?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPdf = !!doc?.file?.match(/\.(pdf)$/i)
  const canZoom = isImage || isPdf

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-100 overflow-hidden">
      {canZoom && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/90 p-1 rounded-md shadow-sm border backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setScale(1)}>
            <Maximize className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-100">
        <div className="min-h-full min-w-full flex items-center justify-center">
          {isImage ? (
            <img
              src={url}
              alt="Documento"
              className="shadow-md bg-white transition-transform duration-200 ease-in-out max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center',
              }}
            />
          ) : isPdf ? (
            <PdfViewer url={url} scale={scale} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center m-auto">
              <p className="text-sm text-destructive mb-2 font-medium">
                Erro ao renderizar prévia.
              </p>
              <p className="text-xs text-muted-foreground">
                Por favor, utilize o botão de Download abaixo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [manualData, setManualData] = useState({
    cnpj: '',
    razao_social: '',
    issuance_date: '',
  })

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
      setRejectionReason(selectedDoc.rejection_reason || '')
      setSelectedStatus(selectedDoc.status || 'Pending')
      setExpirationDate(
        selectedDoc.expiration_date ? selectedDoc.expiration_date.split('T')[0] : '',
      )
      const ex = selectedDoc.analysis_log?.extracted || {}
      setManualData({
        cnpj: ex.cnpj || '',
        razao_social: ex.razao_social || ex.razaoSocial || '',
        issuance_date: ex.issuance_date || ex.data_emissao || ex.dataEmissao || '',
      })
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

  const handleUpdateStatus = async () => {
    if (!selectedDoc) return
    const requiresReason =
      selectedStatus === 'Rejected' || selectedStatus === 'Aguardando Aprovação'
    if (requiresReason && !rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo.')
      return
    }

    try {
      setActionLoading(true)

      const currentLog = selectedDoc.analysis_log || {}
      const updatedLog = {
        ...currentLog,
        extracted: {
          ...currentLog.extracted,
          ...manualData,
        },
      }

      await updateDocument(selectedDoc.id, {
        status: selectedStatus,
        rejection_reason: requiresReason ? rejectionReason : '',
        expiration_date: expirationDate ? new Date(expirationDate).toISOString() : null,
        analysis_log: updatedLog,
      })
      toast.success('Status do documento atualizado com sucesso!')
      setSelectedDoc(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status do documento')
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
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Revisão de Documento</DialogTitle>
            <DialogDescription className="text-base text-foreground mt-1">
              Upload: {selectedDoc?.title || selectedDoc?.expand?.definition?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_550px]">
            {/* Preview Panel */}
            <div className="bg-muted/30 border-b lg:border-b-0 lg:border-r relative p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-2 shrink-0">
                <h3 className="text-sm font-medium">Visualização do Arquivo</h3>
                <div className="flex gap-2">
                  {selectedDoc && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={async () => {
                          try {
                            const token = await pb.files.getToken()
                            const url = pb.files.getUrl(selectedDoc, selectedDoc.file, { token })
                            window.open(url, '_blank')
                          } catch (e) {
                            window.open(pb.files.getUrl(selectedDoc, selectedDoc.file), '_blank')
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir em Nova Aba
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={async () => {
                          try {
                            const token = await pb.files.getToken()
                            const url = pb.files.getUrl(selectedDoc, selectedDoc.file, { token })

                            const response = await fetch(url)
                            const blob = await response.blob()
                            const downloadUrl = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = downloadUrl
                            a.download = selectedDoc.file
                            document.body.appendChild(a)
                            a.click()
                            window.URL.revokeObjectURL(downloadUrl)
                            document.body.removeChild(a)
                          } catch (e) {
                            downloadDocument(selectedDoc)
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {selectedDoc && (
                <div className="flex-1 border rounded-md overflow-hidden bg-white relative min-h-0">
                  <FileViewer doc={selectedDoc} />
                </div>
              )}
            </div>

            {/* Actions & AI Analysis Panel */}
            <div className="flex flex-col h-full bg-background overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
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
                    <p className="text-sm font-bold uppercase">
                      {selectedDoc?.expand?.supplier?.legal_name ||
                        selectedDoc?.expand?.supplier?.name ||
                        selectedDoc?.expand?.user?.name ||
                        selectedDoc?.expand?.user?.email ||
                        '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-base font-semibold mb-2">Análise da IA de Validação</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border">
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
                          <div className="space-y-5">
                            <div>
                              <span className="text-muted-foreground text-xs block mb-1">
                                Status da Validação
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border ${
                                    status === 'Válido'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : status === 'Inválido'
                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>
                              {log.reason && (
                                <p className="text-xs text-muted-foreground mt-2 bg-white/50 p-2 rounded-md border">
                                  {log.reason}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">
                                Resumo da Análise
                              </span>
                              <ul className="space-y-0 text-sm border rounded-lg bg-white dark:bg-slate-950 divide-y">
                                {[
                                  { label: 'CNPJ', field: 'cnpj' as const },
                                  { label: 'Razão Social', field: 'razao_social' as const },
                                  { label: 'Data de Emissão', field: 'issuance_date' as const },
                                ].map((item) => {
                                  const originalValue =
                                    extracted[item.field] ||
                                    (item.field === 'razao_social'
                                      ? extracted.razaoSocial
                                      : item.field === 'issuance_date'
                                        ? extracted.data_emissao || extracted.dataEmissao
                                        : null)
                                  const isPresent =
                                    originalValue !== null &&
                                    originalValue !== undefined &&
                                    originalValue !== '' &&
                                    String(originalValue).toUpperCase() !== 'NÃO IDENTIFICADO' &&
                                    String(originalValue).toUpperCase() !== 'NULL'

                                  return (
                                    <li key={item.label} className="flex flex-col px-4 py-3">
                                      <span className="text-muted-foreground text-xs mb-1">
                                        {item.label}
                                      </span>
                                      <div className="flex flex-col gap-2">
                                        {isPresent ? (
                                          <span className="font-medium text-sm text-foreground">
                                            {String(originalValue)}
                                          </span>
                                        ) : (
                                          <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center text-amber-500">
                                              <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                                              <span className="text-xs italic font-medium">
                                                Não identificado (Preenchimento Manual)
                                              </span>
                                            </div>
                                            <Input
                                              value={manualData[item.field]}
                                              onChange={(e) =>
                                                setManualData((prev) => ({
                                                  ...prev,
                                                  [item.field]: e.target.value,
                                                }))
                                              }
                                              placeholder={`Digite ${item.label}`}
                                              className="h-8 text-sm"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Nenhuma análise disponível.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-4 border-t bg-muted/10 shrink-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Atualizar Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pendente</SelectItem>
                        <SelectItem value="Approved">Aprovado</SelectItem>
                        <SelectItem value="Rejected">Rejeitado</SelectItem>
                        <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Validade (Opcional)</Label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {(selectedStatus === 'Rejected' || selectedStatus === 'Aguardando Aprovação') && (
                  <div className="space-y-2 animate-fade-in-up">
                    <Label className="text-destructive font-medium">Motivo</Label>
                    <textarea
                      placeholder="Descreva claramente o motivo para orientar o fornecedor..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedDoc(null)}
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                  <Button className="w-full" onClick={handleUpdateStatus} disabled={actionLoading}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
