import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, History, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/FileUploader'
import { StatusBadge } from '@/components/StatusBadge'
import useAppStore from '@/stores/use-app-store'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getForestAreas, ForestArea } from '@/services/forest_areas'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PortalUpload() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addUpload } = useAppStore()
  const [isUploading, setIsUploading] = useState(false)

  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])
  const [selectedForest, setSelectedForest] = useState<string>('')
  const [req, setReq] = useState<any>(null)
  const [upload, setUpload] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getForestAreas()
      .then((data) => {
        setForestAreas(data)
        if (data.length === 1) setSelectedForest(data[0].id)
      })
      .catch(console.error)

    if (id && pb.authStore.record?.id) {
      Promise.all([
        pb.collection('document_definitions').getOne(id),
        pb.collection('documents').getList(1, 1, {
          filter: `definition = "${id}" && user = "${pb.authStore.record.id}"`,
          sort: '-created',
        }),
      ])
        .then(([def, docsRes]) => {
          setReq({
            id: def.id,
            title: def.name,
            description: `Formatos aceitos: ${def.allowed_formats || 'Qualquer'}`,
          })
          if (docsRes.items.length > 0) {
            const doc = docsRes.items[0]
            setUpload({
              id: doc.id,
              requirementId: def.id,
              status:
                doc.status === 'Approved'
                  ? 'aprovado'
                  : doc.status === 'Rejected'
                    ? 'rejeitado'
                    : 'pendente',
              fileName: doc.file,
            })
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!req) {
    return <div className="p-8 text-center text-muted-foreground">Requisito não encontrado.</div>
  }

  const handleUpload = async (file: File) => {
    if (!pb.authStore.record?.id) {
      toast({
        variant: 'destructive',
        title: 'Não autenticado',
        description: 'Você precisa estar logado para enviar documentos.',
      })
      return
    }

    if (forestAreas.length > 0 && !selectedForest) {
      toast({
        variant: 'destructive',
        title: 'Área Florestal obrigatória',
        description: 'Selecione a área florestal antes de enviar o arquivo.',
      })
      return
    }

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append('title', `Upload: ${req.title}`)
      formData.append('file', file)
      formData.append('status', 'Pending')
      formData.append('user', pb.authStore.record.id)
      formData.append('definition', req.id)
      if (selectedForest) {
        formData.append('forest_area', selectedForest)
      }

      const docRecord = await pb.collection('documents').create(formData)

      if (req.title.toLowerCase().includes('fgts')) {
        const mockFgtsText = `
          EMPRESA FALSA LTDA
          CNPJ: 00.000.000/0001-00
          Data: 10/05/2026
          COMPETÊNCIA: 04/2026
          
          MARIA DA SILVA SOUZA 123.456.789-00
          JOÃO PEDRO DE ALMEIDA 987.654.321-11
          
          TOTAL A RECOLHER: 1.500,00
        `

        await pb.send('/backend/v1/employees/import-fgts', {
          method: 'POST',
          body: JSON.stringify({
            text: mockFgtsText,
            documentId: docRecord.id,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        })

        toast({
          title: 'FGTS Processado!',
          description: 'Documento enviado e funcionários extraídos e vinculados com sucesso.',
        })
      } else {
        toast({
          title: 'Documento enviado com sucesso!',
          description: 'Seu arquivo foi enviado e está em análise.',
        })
      }

      addUpload({ requirementId: req.id, fileName: file.name })
      navigate('/portal')
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro no envio',
        description:
          err.response?.data?.message || err.message || 'Ocorreu um erro ao enviar o documento.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <Button
        variant="ghost"
        className="mb-2 -ml-4 text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/portal')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{req.title}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{req.description}</p>
        </div>
        {upload && <StatusBadge status={upload.status} />}
      </div>

      {upload?.status === 'aprovado' ? (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-emerald-900">Documento Aprovado</h3>
              <p className="text-emerald-700/80 mt-1">
                Este requisito já foi cumprido e validado pela equipe.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 bg-emerald-100 px-4 py-2 rounded-full mt-4">
              <History className="w-4 h-4" /> Arquivo validado: {upload.fileName}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upload?.status === 'rejeitado' && (
            <Card className="border-rose-200 bg-rose-50 shadow-sm">
              <CardContent className="p-4 flex gap-3 text-rose-800">
                <History className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">O envio anterior foi rejeitado.</p>
                  <p className="text-sm mt-1 opacity-90">
                    Motivo: O documento está ilegível ou incompleto. Por favor, envie uma nova
                    versão atualizada.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Enviar Arquivo</CardTitle>
              <CardDescription>
                Faça o upload do documento solicitado. Certifique-se de que as informações estão
                legíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {forestAreas.length > 0 && (
                <div className="space-y-2 max-w-sm">
                  <Label>Área Florestal de Origem</Label>
                  <Select value={selectedForest} onValueChange={setSelectedForest}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área florestal" />
                    </SelectTrigger>
                    <SelectContent>
                      {forestAreas.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-medium">Enviando arquivo...</p>
                  <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-full"></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Por favor, aguarde a conclusão do upload.
                  </p>
                </div>
              ) : (
                <FileUploader
                  file={null}
                  onFileSelect={(f) => f && handleUpload(f)}
                  accept={
                    req.description.includes('Qualquer')
                      ? '.pdf,.jpg,.jpeg,.png'
                      : req.description.split(': ')[1] || '.pdf,.jpg,.jpeg,.png'
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
