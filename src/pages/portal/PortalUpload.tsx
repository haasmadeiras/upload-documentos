import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UploadCloud, X, File as FileIcon, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

export default function PortalUpload() {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [definitions, setDefinitions] = useState<any[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>(id || '')
  const [targetDocumentId, setTargetDocumentId] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState<string>('')

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const defs = await pb.collection('document_definitions').getFullList()
        setDefinitions(defs)

        if (id) {
          try {
            // Check if id is a document
            const doc = await pb.collection('documents').getOne(id)
            setTargetDocumentId(doc.id)
            if (doc.definition) {
              setSelectedDocId(doc.definition)
            }
          } catch {
            // Otherwise, it might be a definition id
            const def = defs.find((d) => d.id === id)
            if (def) {
              setSelectedDocId(def.id)
            }
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [id])

  const selectedDefinition = definitions.find((d) => d.id === selectedDocId)
  const allowedFormatsString = selectedDefinition?.allowed_formats || 'pdf, jpg, png'
  const allowedFormats = allowedFormatsString
    .split(',')
    .map((s: string) => s.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)

  const acceptAttr = allowedFormats
    .map((f: string) => {
      if (f === 'pdf') return '.pdf,application/pdf'
      if (f === 'jpg' || f === 'jpeg') return '.jpg,.jpeg,image/jpeg'
      if (f === 'png') return '.png,image/png'
      return `.${f}`
    })
    .join(',')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const mime = selectedFile.type.toLowerCase()

    let isValid = false
    for (const format of allowedFormats) {
      if (format === 'pdf' && (ext === 'pdf' || mime === 'application/pdf')) isValid = true
      if (
        (format === 'jpg' || format === 'jpeg') &&
        (['jpg', 'jpeg'].includes(ext) || mime === 'image/jpeg')
      )
        isValid = true
      if (format === 'png' && (ext === 'png' || mime === 'image/png')) isValid = true
      if (ext === format) isValid = true
    }

    if (!isValid) {
      toast.error(`Formato inválido. Aceitos: ${allowedFormats.join(', ')}.`)
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 5MB.')
      return
    }
    setFile(selectedFile)
  }

  const simulateUpload = async () => {
    if (!selectedDocId) {
      toast.error('Selecione qual documento está enviando.')
      return
    }
    if (!file) {
      toast.error('Nenhum arquivo selecionado.')
      return
    }

    setUploading(true)
    setProgress(30)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('status', 'Pending')

      const userId = pb.authStore.record?.id
      if (targetDocumentId) {
        await pb.collection('documents').update(targetDocumentId, formData)
      } else {
        formData.append('title', selectedDefinition?.name || file.name)
        formData.append('definition', selectedDocId)
        formData.append('user', userId || '')
        if (pb.authStore.record?.supplier) {
          formData.append('supplier', pb.authStore.record.supplier)
        }
        await pb.collection('documents').create(formData)
      }

      setProgress(100)
      setTimeout(() => {
        setUploading(false)
        toast.success('Documento enviado com sucesso! Status atualizado para: Em Análise.')
        navigate('/portal')
      }, 500)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao enviar documento.')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Central de Upload</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Envie seus documentos pendentes de forma rápida e segura.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Detalhes do Documento</CardTitle>
          <CardDescription>Identifique qual exigência está sendo cumprida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select
              value={selectedDocId}
              onValueChange={setSelectedDocId}
              disabled={!!targetDocumentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pendência..." />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} {def.is_mandatory ? '(Obrigatório)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Validade (se aplicável)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-10 text-muted-foreground"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: {allowedFormats.join(', ').toUpperCase()} (Max 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={acceptAttr}
              />
              <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-1">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground">
                O processo é criptografado e 100% seguro.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <FileIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="text-muted-foreground hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {uploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Enviando arquivo...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted/20 p-4">
          <Button variant="outline" onClick={() => navigate('/portal')} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={simulateUpload} disabled={!file || !selectedDocId || uploading}>
            {uploading ? 'Processando...' : 'Finalizar Upload'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
