import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, UploadCloud, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/FileUploader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getEmployee, Employee } from '@/services/employees'
import { getDocumentDefinitions, DocumentDefinition } from '@/services/document_definitions'
import { getDocuments, createDocument, downloadDocument } from '@/services/documents'
import { toast } from 'sonner'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function PortalEmployeeDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [defs, setDefs] = useState<DocumentDefinition[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDefId, setUploadingDefId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const loadData = async () => {
    if (!id) return
    try {
      const [emp, allDefs, allDocs] = await Promise.all([
        getEmployee(id),
        getDocumentDefinitions(),
        getDocuments(`employee = "${id}"`),
      ])
      setEmployee(emp)
      const validDefs = allDefs.filter(
        (d) =>
          (d.target_role === 'all' || d.target_role === emp.role) &&
          d.expand?.category?.name?.toLowerCase().includes('funcion'),
      )
      setDefs(validDefs)
      setDocs(allDocs)
    } catch (e) {
      toast.error('Erro ao carregar dados do funcionário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !uploadingDefId || !employee || !user) return

    try {
      const formData = new FormData()
      formData.append('title', `Documento - ${employee.name}`)
      formData.append('file', file)
      formData.append('status', 'Pending')
      formData.append('user', user.id)
      formData.append('employee', employee.id)
      formData.append('definition', uploadingDefId)

      await createDocument(formData)
      toast.success('Documento enviado com sucesso!')
      setUploadingDefId(null)
      setFile(null)
      loadData()
    } catch (err) {
      toast.error('Erro ao enviar documento')
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!employee) return <div className="p-8 text-center">Funcionário não encontrado</div>

  const getDocStatusInfo = (def: DocumentDefinition) => {
    const doc = docs.find((d) => d.definition === def.id)
    if (!doc)
      return {
        status: 'Missing',
        label: 'Pendente Envio',
        color: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
      }
    if (doc.status === 'Approved')
      return {
        status: 'Approved',
        doc,
        label: 'Aprovado',
        color: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      }
    if (doc.status === 'Rejected')
      return {
        status: 'Rejected',
        doc,
        label: 'Rejeitado',
        color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      }
    if (doc.status === 'Vencido' || doc.status === 'Expired')
      return {
        status: 'Vencido',
        doc,
        label: 'Vencido',
        color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
      }
    return {
      status: 'Pending',
      doc,
      label: 'Em Análise',
      color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
    }
  }

  const getValidityDate = (def: DocumentDefinition, doc: any) => {
    if (!doc || !doc.created || def.validity_days === 0) return 'N/A'
    const createdDate = parseISO(doc.created)
    if (!isValid(createdDate)) return 'N/A'
    const validUntil = addDays(createdDate, def.validity_days)
    return format(validUntil, 'dd/MM/yyyy')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={user?.isAdmin ? '/admin/employees' : '/portal/employees'}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-muted-foreground">
            CPF: {employee.tax_id} | Função: <span className="capitalize">{employee.role}</span>
          </p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defs.map((def) => {
              const { status, label, color, doc } = getDocStatusInfo(def)
              const validity = getValidityDate(def, doc)

              return (
                <TableRow key={def.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {def.name}
                      {status === 'Rejected' && (
                        <AlertCircle className="w-4 h-4 text-rose-500" title="Rejeitado" />
                      )}
                      {status === 'Vencido' && (
                        <AlertCircle className="w-4 h-4 text-orange-500" title="Vencido" />
                      )}
                    </div>
                    {def.validity_days > 0 && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        Válido por {def.validity_days} dias
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Formatos: {def.allowed_formats || 'Qualquer'} | Max: {def.max_size_mb || 10}MB
                    </div>
                  </TableCell>
                  <TableCell>{def.is_mandatory ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>{validity}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={`border-0 ${color}`}>
                        {label}
                      </Badge>
                      {status === 'Rejected' && doc?.rejection_reason && (
                        <div className="text-xs text-rose-600 font-medium leading-tight max-w-[200px]">
                          Motivo: {doc.rejection_reason}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadDocument(doc)}
                          title="Baixar Documento"
                        >
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      {status === 'Missing' || status === 'Rejected' ? (
                        <Dialog
                          open={uploadingDefId === def.id}
                          onOpenChange={(open) => !open && setUploadingDefId(null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setUploadingDefId(def.id)}>
                              <UploadCloud className="w-4 h-4 mr-2" /> Enviar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Enviar Documento: {def.name}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpload} className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Arquivo</Label>
                                <FileUploader
                                  file={file}
                                  onFileSelect={setFile}
                                  accept={def.allowed_formats || '.pdf,.jpg,.png'}
                                  maxSizeMb={def.max_size_mb || 10}
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={!file}>
                                Confirmar Envio
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Enviado em{' '}
                          {doc?.created ? format(parseISO(doc.created), 'dd/MM/yyyy') : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
