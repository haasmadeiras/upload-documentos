import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react'
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
import { getDocuments, updateDocument } from '@/services/documents'
import { useToast } from '@/hooks/use-toast'

export default function PortalDashboard() {
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<any[]>([])
  const [activeUploadDoc, setActiveUploadDoc] = useState<any | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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

  const handleUploadComplete = async (file: File) => {
    if (activeUploadDoc && user) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('status', 'Pending')

        await updateDocument(activeUploadDoc.id, formData)
        toast({ title: 'Documento reenviado com sucesso!' })
        setActiveUploadDoc(null)
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message })
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-1/3 shrink-0 flex flex-col items-center text-center justify-center p-6 border-blue-100 bg-blue-50/30">
          <CardTitle className="mb-6 text-xl">Status do Cadastro</CardTitle>
          <CircularProgress value={progress} size={160} strokeWidth={14} className="mb-6" />
          <p className="text-sm text-muted-foreground px-4">
            Envie todos os documentos obrigatórios para concluir a homologação.
          </p>
        </Card>

        <Card className="flex-1 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Meus Documentos
            </CardTitle>
            <CardDescription>
              Fornecedor: <strong className="text-foreground">{user?.name || user?.email}</strong>
            </CardDescription>
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
                  const needsUpload = doc.status === 'Rejected' || doc.status === 'Pending'

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
                      </div>

                      <div className="flex items-center gap-4 sm:ml-8 mt-2 sm:mt-0 shrink-0">
                        <Badge
                          variant="outline"
                          className={`px-3 py-1 text-sm font-medium ${info.color}`}
                        >
                          {info.label}
                        </Badge>

                        {needsUpload ? (
                          <Button size="sm" onClick={() => setActiveUploadDoc(doc)}>
                            <Upload className="w-4 h-4 mr-2" /> Reenviar
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled>
                            Enviado
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!activeUploadDoc} onOpenChange={(open) => !open && setActiveUploadDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>{activeUploadDoc?.title}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isUploading ? (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
              </div>
            ) : (
              <FileUploader onUploadComplete={handleUploadComplete} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
