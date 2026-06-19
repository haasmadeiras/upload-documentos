import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/FileUploader'
import { createDocument } from '@/services/documents'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function PortalUpload() {
  const { id } = useParams() // definition ID
  const navigate = useNavigate()
  const { user } = useAuth()
  const [definition, setDefinition] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!id) return
    pb.collection('document_definitions')
      .getOne(id)
      .then(setDefinition)
      .catch(() => toast.error('Erro ao carregar definição do documento.'))
      .finally(() => setFetching(false))
  }, [id])

  const handleUpload = async () => {
    if (!file || !user || !definition) return
    setLoading(true)

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

      await createDocument(formData)
      toast.success('Documento enviado com sucesso.')
      navigate(`/portal/documents/category/${definition.category}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar documento.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!definition) return <div>Documento não encontrado.</div>

  const allowedFormats = definition.allowed_formats || '.pdf,.jpg,.png'
  const maxSizeMb = definition.max_size_mb || 20

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fazer Upload</h1>
        <p className="text-muted-foreground mt-2">Envie o arquivo solicitado abaixo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{definition.name}</CardTitle>
          <CardDescription>
            {definition.is_mandatory && (
              <span className="text-rose-500 font-medium mr-2">Obrigatório</span>
            )}
            Formatos permitidos: {allowedFormats}
            <br />
            Tamanho máximo: {maxSizeMb} MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploader
            file={file}
            onFileSelect={setFile}
            accept={allowedFormats}
            maxSizeMb={maxSizeMb}
          />

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? 'Enviando...' : 'Enviar Documento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
