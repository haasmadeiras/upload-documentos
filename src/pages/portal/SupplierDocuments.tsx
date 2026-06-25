import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  XCircle,
  FileUp,
  ChevronRight,
  Download,
  Trash2,
  Clock,
  Eye,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { StatusBadge } from '@/components/StatusBadge'
import { downloadDocument, deleteDocument } from '@/services/documents'

export default function SupplierDocuments() {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const [definitions, setDefinitions] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      toast.success('Documento excluído com sucesso.')
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir documento.')
    }
  }

  const loadData = async () => {
    if (!user) return
    try {
      const defsFilter = categoryId ? `category = "${categoryId}"` : ''

      const [defsRes, docsRes] = await Promise.all([
        pb.collection('document_definitions').getFullList({
          filter: defsFilter,
          sort: '-is_mandatory,name',
        }),
        pb.collection('documents').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        }),
      ])

      const userPersonType = user.person_type || 'PJ'
      const filteredDefs = defsRes.filter(
        (def) =>
          (!def.target_person_type ||
            def.target_person_type === 'Both' ||
            def.target_person_type === userPersonType) &&
          (!def.target_role || def.target_role === 'all'),
      )

      setDefinitions(filteredDefs)
      setDocuments(docsRes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, categoryId])

  useRealtime('documents', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getLatestDoc = (defId: string) => {
    return documents.find((d) => d.definition === defId)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e envie os documentos necessários para a sua conformidade.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {definitions.map((def) => {
          const doc = getLatestDoc(def.id)
          let status = doc?.status?.toLowerCase() || 'missing'

          let isExpiringSoon = false
          let isExpired = false

          if (doc && (status === 'approved' || status === 'aprovado') && def.validity_days) {
            const updatedDate = new Date(doc.updated)
            const expiryDate = new Date(
              updatedDate.getTime() + def.validity_days * 24 * 60 * 60 * 1000,
            )
            const daysToExpiry = Math.ceil(
              (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
            )

            if (daysToExpiry <= 0) {
              isExpired = true
              status = 'vencido'
            } else if (daysToExpiry <= 30) {
              isExpiringSoon = true
            }
          }

          const isErrorState =
            status === 'rejected' || status === 'rejeitado' || status === 'vencido'

          return (
            <Card
              key={def.id}
              className={cn(
                'flex flex-col',
                isErrorState && 'border-rose-300 shadow-sm ring-1 ring-rose-100',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-lg leading-tight">{def.name}</CardTitle>
                  {def.is_mandatory && (
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary">
                      Obrigatório
                    </Badge>
                  )}
                </div>
                {isErrorState && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md mt-2 w-fit">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Atenção necessária
                  </div>
                )}
                <CardDescription className="text-sm mt-1">
                  Formatos aceitos: {def.allowed_formats || 'Todos'}
                </CardDescription>
              </CardHeader>

              <CardContent className="mt-auto pt-0 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    {status === 'missing' ? (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground gap-1.5 font-medium"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Não Enviado
                      </Badge>
                    ) : status === 'vencido' ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-100 text-rose-800 border-rose-200 gap-1.5 font-medium"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Vencido
                      </Badge>
                    ) : status === 'pending' || status === 'pendente' ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 font-medium animate-pulse"
                      >
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                        Analisando Documento
                      </Badge>
                    ) : (
                      <StatusBadge status={doc.status} />
                    )}
                  </div>

                  {(status === 'rejected' || status === 'rejeitado') && doc?.rejection_reason && (
                    <div className="text-sm p-2.5 bg-rose-50 text-rose-800 rounded-md border border-rose-100 flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Falha na validação</span>
                        <span className="text-rose-700">{doc.rejection_reason}</span>
                      </div>
                    </div>
                  )}

                  {isExpiringSoon && !isExpired && (
                    <div className="text-sm p-2.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Este documento expira em breve.</span>
                    </div>
                  )}

                  {doc?.analysis_log && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs justify-start w-fit text-muted-foreground hover:text-foreground"
                        >
                          <Info className="w-3 h-3 mr-1.5" />
                          Ver análise da IA
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 text-sm space-y-2" align="start">
                        <div className="font-medium text-foreground mb-1">
                          Detalhes da Análise IA
                        </div>
                        {doc.analysis_log.extracted_tax_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CNPJ/CPF:</span>
                            <span className="font-medium">{doc.analysis_log.extracted_tax_id}</span>
                          </div>
                        )}
                        {doc.analysis_log.extracted_name && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Nome Identificado:</span>
                            <span className="font-medium line-clamp-2">
                              {doc.analysis_log.extracted_name}
                            </span>
                          </div>
                        )}
                        {doc.analysis_log.extracted_plate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Placa Identificada:</span>
                            <span className="font-medium">{doc.analysis_log.extracted_plate}</span>
                          </div>
                        )}
                        {doc.analysis_log.control_code && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Código de Controle:</span>
                            <span className="font-medium truncate">
                              {doc.analysis_log.control_code}
                            </span>
                          </div>
                        )}
                        {doc.analysis_log.has_signature !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Assinado:</span>
                            <span className="font-medium">
                              {doc.analysis_log.has_signature ? 'Sim' : 'Não'}
                            </span>
                          </div>
                        )}
                        {doc.analysis_log.is_legible !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Legível:</span>
                            <span className="font-medium">
                              {doc.analysis_log.is_legible ? 'Sim' : 'Não'}
                            </span>
                          </div>
                        )}
                        {doc.analysis_log.match_confidence && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Confiança:</span>
                            <span className="font-medium">{doc.analysis_log.match_confidence}</span>
                          </div>
                        )}
                        {doc.analysis_log.explanation && (
                          <div className="flex flex-col mt-2 pt-2 border-t">
                            <span className="text-muted-foreground mb-1">Explicação:</span>
                            <span className="text-foreground">{doc.analysis_log.explanation}</span>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}

                  {doc?.expiration_date && status !== 'rejected' && status !== 'rejeitado' && (
                    <div className="text-sm p-2.5 bg-blue-50 text-blue-800 rounded-md border border-blue-100 flex items-start gap-2">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>VCTO:</strong>{' '}
                        {new Date(doc.expiration_date).toLocaleDateString('pt-BR', {
                          timeZone: 'UTC',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    asChild
                    variant={
                      status === 'approved' ||
                      status === 'aprovado' ||
                      status === 'pending' ||
                      status === 'pendente' ||
                      status === 'aguardando aprovação'
                        ? 'outline'
                        : 'default'
                    }
                    className="flex-1 justify-between group"
                  >
                    <Link to={`/portal/upload/${def.id}`}>
                      {status === 'approved' || status === 'aprovado'
                        ? 'Detalhes / Reenviar'
                        : status === 'missing' ||
                            status === 'rejected' ||
                            status === 'rejeitado' ||
                            status === 'vencido'
                          ? 'Fazer Upload'
                          : 'Detalhes'}
                      {status === 'approved' ||
                      status === 'aprovado' ||
                      status === 'pending' ||
                      status === 'pendente' ||
                      status === 'aguardando aprovação' ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      ) : (
                        <FileUp className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  </Button>
                  {doc && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        asChild
                        title="Visualizar Arquivo"
                      >
                        <a
                          href={pb.files.getUrl(doc, doc.file)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => downloadDocument(doc)}
                        title="Baixar Documento"
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 border-rose-200 hover:bg-rose-50"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o documento "{def.name}"? Esta ação não
                              pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id)}
                              className="bg-rose-500 text-white hover:bg-rose-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
