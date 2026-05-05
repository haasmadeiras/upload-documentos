import React, { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
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

export default function PortalDashboard() {
  const { user, groups, uploads, uploadDocument } = useApp()
  const [activeUploadReqId, setActiveUploadReqId] = useState<string | null>(null)

  // Find the requirements for the user's group
  const userGroup = groups.find((g) => g.id === user?.groupId) || groups[0]
  const requirements = userGroup?.requirements || []

  // Calculate progress
  const approvedDocs = requirements.filter((req) =>
    uploads.some((u) => u.reqId === req.id && u.status === 'Aprovado'),
  ).length
  const progress = requirements.length > 0 ? (approvedDocs / requirements.length) * 100 : 0

  const getStatusInfo = (reqId: string) => {
    const upload = uploads.find((u) => u.reqId === reqId)
    if (!upload)
      return { status: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }

    switch (upload.status) {
      case 'Aprovado':
        return {
          status: 'Aprovado',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        }
      case 'Em Análise':
        return {
          status: 'Em Análise',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Info,
        }
      case 'Rejeitado':
        return {
          status: 'Rejeitado',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: AlertCircle,
        }
      default:
        return { status: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
    }
  }

  const handleUploadComplete = (file: File) => {
    if (activeUploadReqId) {
      uploadDocument(activeUploadReqId, file)
      setActiveUploadReqId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Progress Card */}
        <Card className="md:w-1/3 shrink-0 flex flex-col items-center text-center justify-center p-6 border-blue-100 bg-blue-50/30">
          <CardTitle className="mb-6 text-xl">Status do Cadastro</CardTitle>
          <CircularProgress value={progress} size={160} strokeWidth={14} className="mb-6" />
          <p className="text-sm text-muted-foreground px-4">
            Envie todos os documentos obrigatórios para concluir a homologação.
          </p>
        </Card>

        {/* Requirements List */}
        <Card className="flex-1 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Meus Documentos
            </CardTitle>
            <CardDescription>
              Categoria: <strong className="text-foreground">{userGroup?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t">
              {requirements.map((req) => {
                const info = getStatusInfo(req.id)
                const upload = uploads.find((u) => u.reqId === req.id)
                const needsUpload = info.status === 'Pendente' || info.status === 'Rejeitado'

                return (
                  <div
                    key={req.id}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <info.icon className={`w-5 h-5 shrink-0 ${info.color.split(' ')[1]}`} />
                        <h4 className="font-semibold text-base">{req.title}</h4>
                        {req.mandatory && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">{req.description}</p>

                      {upload?.comments && info.status === 'Rejeitado' && (
                        <div className="ml-8 mt-2 p-3 bg-rose-50 text-rose-800 rounded-md text-sm border border-rose-100 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            <strong>Motivo da rejeição:</strong> {upload.comments}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 sm:ml-8 mt-2 sm:mt-0 shrink-0">
                      <Badge
                        variant="outline"
                        className={`px-3 py-1 text-sm font-medium ${info.color}`}
                      >
                        {info.status}
                      </Badge>

                      {needsUpload ? (
                        <Button size="sm" onClick={() => setActiveUploadReqId(req.id)}>
                          <Upload className="w-4 h-4 mr-2" /> Enviar
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled>
                          Enviado
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!activeUploadReqId}
        onOpenChange={(open) => !open && setActiveUploadReqId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>
              {requirements.find((r) => r.id === activeUploadReqId)?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FileUploader onUploadComplete={handleUploadComplete} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
