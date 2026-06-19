import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  FileCheck2,
  Clock,
  XCircle,
  FileWarning,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { FileUploader } from '@/components/FileUploader'
import { createDocument, updateDocument } from '@/services/documents'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export default function PortalUpload() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [definition, setDefinition] = useState<any>(null)
  const [existingDoc, setExistingDoc] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [progressValue, setProgressValue] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (validating) {
      setProgressValue(0)
      interval = setInterval(() => {
        setProgressValue((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 800)
    } else if (progressValue > 0) {
      setProgressValue(100)
      const timeout = setTimeout(() => setProgressValue(0), 1500)
      return () => clearTimeout(timeout)
    }
    return () => clearInterval(interval)
  }, [validating])

  const loadData = async () => {
    if (!user || !id) return
    try {
      const def = await pb.collection('document_definitions').getOne(id)
      setDefinition(def)

      const docs = await pb.collection('documents').getFullList({
        filter: `user = "${user.id}" && definition = "${id}"`,
        sort: '-created',
        limit: 1,
      })

      if (docs.length > 0) {
        setExistingDoc(docs[0])

        if (docs[0].status === 'Pending') {
          setValidating(true)
        } else if (validating && docs[0].status !== 'Pending') {
          setValidating(false)

          if (docs[0].status === 'Rejected' || docs[0].status === 'Vencido') {
            toast.error('O documento foi rejeitado pela análise.', {
              description:
                docs[0].rejection_reason ||
                'Documento rejeitado. Por favor, verifique os dados e tente novamente.',
            })
          } else if (docs[0].status === 'Approved') {
            toast.success('Documento analisado e aceito com sucesso!')
            setTimeout(() => navigate('/portal/contratados'), 1500)
          } else {
            toast.info('Documento em análise manual.')
          }
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, id])

  useRealtime('documents', () => {
    loadData()
  })

  const handleSubmit = async () => {
    if (!file || !user || !definition) return

    setSubmitting(true)
    setValidating(true)
    try {
      const formData = new FormData()
      formData.append('title', definition.name)
      formData.append('file', file)
      formData.append('user', user.id)
      formData.append('definition', definition.id)
      formData.append('status', 'Pending')
      if (user.supplier) {
        formData.append('supplier', user.supplier)
      }

      if (existingDoc) {
        await updateDocument(existingDoc.id, formData)
      } else {
        await createDocument(formData)
      }

      toast.info('Documento enviado. Em análise pela IA...')
      setFile(null)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao enviar documento.', {
        description: err?.message || 'Tente novamente.',
      })
      setValidating(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!definition) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Definição de documento não encontrada.
      </div>
    )
  }

  const isErrorState = existingDoc?.status === 'Rejected' || existingDoc?.status === 'Vencido'
  const isApproved = existingDoc?.status === 'Approved'
  const isPending =
    existingDoc?.status === 'Pending' || existingDoc?.status === 'Aguardando Aprovação'

  const fileUrl = existingDoc
    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${existingDoc.collectionId}/${existingDoc.id}/${existingDoc.file}`
    : ''

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enviar Documento</h1>
          <p className="text-muted-foreground">Anexe o arquivo para o requisito selecionado.</p>
        </div>
      </div>

      {existingDoc && (
        <Card
          className={cn(
            'overflow-hidden transition-colors border-l-4',
            isErrorState
              ? 'border-l-rose-500 bg-rose-50/50'
              : isApproved
                ? 'border-l-emerald-500 bg-emerald-50/50'
                : existingDoc.status === 'Aguardando Aprovação'
                  ? 'border-l-blue-500 bg-blue-50/50'
                  : 'border-l-amber-500 bg-amber-50/50',
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {isApproved && <FileCheck2 className="w-5 h-5 text-emerald-600" />}
                  {isErrorState && <XCircle className="w-5 h-5 text-rose-600" />}
                  {existingDoc.status === 'Aguardando Aprovação' && (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                  {existingDoc.status === 'Pending' && <Clock className="w-5 h-5 text-amber-600" />}
                  Status Atual: {existingDoc.status}
                </CardTitle>
                <CardDescription className="mt-1">
                  Enviado em {new Date(existingDoc.created).toLocaleDateString('pt-BR')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0 gap-2">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4" />
                  Visualizar
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingDoc.status === 'Aguardando Aprovação' && (
              <Alert className="bg-blue-50 border-blue-500 text-blue-900 shadow-sm">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-800 font-semibold">
                  Análise Manual Necessária
                </AlertTitle>
                <AlertDescription className="mt-2 text-blue-700 font-medium">
                  Seu documento está em análise manual pela nossa equipe.
                </AlertDescription>
              </Alert>
            )}

            {existingDoc.expiration_date && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Data de Validade:</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md',
                    existingDoc.status === 'Vencido'
                      ? 'bg-rose-100 text-rose-700 font-semibold'
                      : 'bg-muted',
                  )}
                >
                  {new Date(existingDoc.expiration_date).toLocaleDateString('pt-BR', {
                    timeZone: 'UTC',
                  })}
                </span>
              </div>
            )}

            {isErrorState && (
              <Alert
                variant="destructive"
                className="bg-rose-50 border-rose-500 text-rose-900 shadow-sm"
              >
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <AlertTitle className="text-rose-800 font-semibold">
                  {existingDoc.status === 'Vencido' ? 'Documento Vencido' : 'Motivo da Rejeição'}
                </AlertTitle>
                <AlertDescription className="mt-2 text-rose-700 font-medium">
                  {existingDoc.rejection_reason ||
                    (existingDoc.status === 'Vencido'
                      ? 'O documento anexado já passou da data de validade.'
                      : 'Documento rejeitado. Por favor, verifique os dados e tente novamente.')}
                </AlertDescription>
              </Alert>
            )}

            {existingDoc.analysis_log?.explanation && (
              <div className="rounded-md border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <FileWarning className="w-4 h-4" />
                  Justificativa da IA
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingDoc.analysis_log.explanation}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-xs">
                  {existingDoc.analysis_log.extracted_tax_id && (
                    <div>
                      <span className="font-medium block">CNPJ/CPF Extraído:</span>
                      <span className="text-muted-foreground">
                        {existingDoc.analysis_log.extracted_tax_id}
                      </span>
                    </div>
                  )}
                  {existingDoc.analysis_log.extracted_name && (
                    <div>
                      <span className="font-medium block">Nome Extraído:</span>
                      <span className="text-muted-foreground">
                        {existingDoc.analysis_log.extracted_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={cn(isErrorState && 'border-rose-200 shadow-sm shadow-rose-100')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {existingDoc ? 'Reenviar Documento' : definition.name}
          </CardTitle>
          <CardDescription>
            {definition.is_mandatory && (
              <span className="font-semibold text-primary mr-1">Obrigatório.</span>
            )}
            Formatos permitidos: {definition.allowed_formats || 'Todos'}.
            {definition.validity_days ? ` Validade: ${definition.validity_days} dias.` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {definition.ai_validation_instructions && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <span className="font-medium text-foreground">Instruções de validação: </span>
              {definition.ai_validation_instructions}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivo do Documento</label>
            <FileUploader
              file={file}
              onFileSelect={setFile}
              accept={definition.allowed_formats?.replace(/\s/g, '') || '.pdf,.jpg,.jpeg,.png'}
              maxSizeMb={definition.max_size_mb || 20}
            />
          </div>

          {validating || progressValue > 0 ? (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary animate-pulse">
                  {submitting ? 'Enviando documento...' : 'A IA está analisando seu documento...'}
                </span>
                <span className="text-muted-foreground">{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Isso pode levar alguns segundos. Por favor, não feche esta página.
              </p>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting || validating || (isPending && !file)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!file || submitting || validating || isPending}
                className="min-w-[140px]"
              >
                Enviar Documento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
