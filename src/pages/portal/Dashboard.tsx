import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, FileText, CheckCircle2, AlertCircle, Info, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUploader } from '@/components/FileUploader'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { useRealtime } from '@/hooks/use-realtime'
import { getDocuments, createDocument } from '@/services/documents'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

export default function PortalDashboard() {
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<any[]>([])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async () => {
    if (!user) return
    try {
      const docs = await getDocuments()
      setDocuments(docs)
    } catch (e) {
      console.error('Failed to fetch documents', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime(
    'documents',
    () => {
      loadData()
    },
    !!user,
  )

  if (loading) return null
  if (!user) return <Navigate to="/" replace />

  const approvedDocs = documents.filter((doc) => doc.status === 'Approved').length
  const progress = documents.length > 0 ? (approvedDocs / documents.length) * 100 : 0

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Approved':
        return {
          label: 'Aprovado',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        }
      case 'Pending':
        return {
          label: 'Em Análise',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Info,
        }
      case 'Rejected':
        return {
          label: 'Rejeitado',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: AlertCircle,
        }
      default:
        return { label: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
    }
  }

  const handleCreateDocument = async () => {
    if (!newTitle.trim()) {
      setErrorMsg('Por favor, informe o título do documento.')
      return
    }
    if (!newFile) {
      setErrorMsg('Por favor, selecione o arquivo.')
      return
    }

    setIsUploading(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('title', newTitle)
      formData.append('file', newFile)
      formData.append('status', 'Pending')
      formData.append('user', user.id)

      await createDocument(formData)
      toast({ title: 'Documento enviado com sucesso!' })
      setIsCreateOpen(false)
      setNewTitle('')
      setNewFile(null)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar documento')
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-1/3 shrink-0 flex flex-col items-center text-center justify-center p-6 border-blue-100 bg-blue-50/30">
          <CardTitle className="mb-6 text-xl">Status do Cadastro</CardTitle>
          {/* @ts-expect-error */}
          <CircularProgress value={progress} size={160} strokeWidth={14} className="mb-6" />
          <p className="text-sm text-muted-foreground px-4">
            Envie todos os documentos obrigatórios para concluir a homologação.
          </p>
        </Card>

        <Card className="flex-1 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Meus Documentos
              </CardTitle>
              <CardDescription className="mt-1">
                Fornecedor: <strong className="text-foreground">{user?.name || user?.email}</strong>
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Upload Documento
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t">
              {documents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Nenhum documento encontrado.
                </div>
              ) : (
                documents.map((doc) => {
                  const info = getStatusInfo(doc.status)
                  const dateStr = doc.created ? format(new Date(doc.created), 'dd/MM/yyyy') : ''

                  return (
                    <div
                      key={doc.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <info.icon className={`w-5 h-5 shrink-0 ${info.color.split(' ')[1]}`} />
                          <h4 className="font-semibold text-base">{doc.title}</h4>
                        </div>
                        {dateStr && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-8">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Enviado em {dateStr}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 sm:ml-8 mt-2 sm:mt-0 shrink-0">
                        <Badge
                          variant="outline"
                          className={`px-3 py-1 text-sm font-medium ${info.color}`}
                        >
                          {info.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setNewTitle('')
            setNewFile(null)
            setErrorMsg(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
            <DialogDescription>Envie um novo documento para análise.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {errorMsg && (
              <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título do Documento</Label>
              <Input
                id="title"
                placeholder="Ex: Contrato Social"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label>Arquivo</Label>
              <FileUploader file={newFile} onFileSelect={setNewFile} />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateDocument} disabled={isUploading}>
                {isUploading ? 'Enviando...' : 'Enviar Documento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
