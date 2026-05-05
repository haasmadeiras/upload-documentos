import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, X, File as FileIcon, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

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
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Formato inválido. Aceitos: PDF, JPG, PNG.')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      // 5MB
      toast.error('O arquivo deve ter no máximo 5MB.')
      return
    }
    setFile(selectedFile)
  }

  const simulateUpload = () => {
    if (!selectedDoc) {
      toast.error('Selecione qual documento está enviando.')
      return
    }
    if (!file) {
      toast.error('Nenhum arquivo selecionado.')
      return
    }

    setUploading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setUploading(false)
            toast.success('Documento enviado com sucesso! Status atualizado para: Em Análise.')
            navigate('/portal')
          }, 500)
          return 100
        }
        return prev + 20
      })
    }, 400)
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
            <Select value={selectedDoc} onValueChange={setSelectedDoc}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pendência..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cnd">Certidão Negativa de Débitos (CND)</SelectItem>
                <SelectItem value="balanco">Balanço Patrimonial</SelectItem>
                <SelectItem value="bancario">Comprovante Bancário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Validade (se aplicável)</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" className="pl-10 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Arquivo</CardTitle>
          <CardDescription>Formatos aceitos: PDF, JPG, PNG (Max 5MB)</CardDescription>
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
                accept=".pdf,.jpg,.jpeg,.png"
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
          <Button onClick={simulateUpload} disabled={!file || !selectedDoc || uploading}>
            {uploading ? 'Processando...' : 'Finalizar Upload'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
