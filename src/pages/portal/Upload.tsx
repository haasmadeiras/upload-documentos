import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { FileUploader } from '@/components/FileUploader'
import { createDocument, updateDocument } from '@/services/documents'
import { useRealtime } from '@/hooks/use-realtime'

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

        // If we are waiting for AI validation and the status changes from Pending
        if (validating && docs[0].status !== 'Pending') {
          setValidating(false)

          if (docs[0].status === 'Rejected' || docs[0].status === 'Vencido') {
            toast.error('O documento foi rejeitado pela análise.', {
              description: docs[0].rejection_reason,
            })
            // Intercept navigation - keep user on page to review error and re-upload
          } else {
            toast.success('Documento analisado e aceito com sucesso!')
            setTimeout(() => navigate('/portal/contratados'), 1500)
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

      setValidating(true)
      toast.info('Documento enviado. Em análise pela IA...')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao enviar documento.', {
        description: err?.message || 'Tente novamente.',
      })
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

      {existingDoc && isErrorState && !validating && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Documento Rejeitado ou Vencido</AlertTitle>
          <AlertDescription className="mt-1">
            <span className="block mb-2 font-medium">{existingDoc.rejection_reason}</span>
            {existingDoc.analysis_log?.explanation && (
              <span className="block text-sm opacity-90 border-t border-rose-200 pt-2 mt-2">
                Análise da IA: {existingDoc.analysis_log.explanation}
              </span>
            )}
            Por favor, verifique os erros acima e reenvie um documento válido.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {definition.name}
          </CardTitle>
          <CardDescription>
            {definition.is_mandatory && (
              <span className="font-semibold text-primary mr-1">Obrigatório.</span>
            )}
            Formatos permitidos: {definition.allowed_formats || 'Todos'}.
            {definition.validity_days && ` Validade: ${definition.validity_days} dias.`}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={submitting || validating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || submitting || validating}
              className="min-w-[140px]"
            >
              {submitting || validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {validating ? 'Analisando...' : 'Enviando...'}
                </>
              ) : (
                'Enviar Documento'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
