import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FileUploader } from '@/components/FileUploader'
import { useAuth } from '@/hooks/use-auth'
import { Navigate, useLocation } from 'react-router-dom'
import { useRealtime } from '@/hooks/use-realtime'
import { getDocuments, createDocument } from '@/services/documents'
import { getDocumentCategories, DocumentCategory } from '@/services/document_categories'
import { getDocumentDefinitions, DocumentDefinition } from '@/services/document_definitions'
import { getEmployees } from '@/services/employees'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { CircularProgress } from '@/components/ui/circular-progress'
import { cn } from '@/lib/utils'

const getCategoryNameFromPath = (pathname: string) => {
  if (pathname.includes('/fornecedor')) return 'Fornecedor'
  if (pathname.includes('/veiculos')) return 'Veículos'
  if (pathname.includes('/contratados')) return 'Contratados'
  if (pathname.includes('/florestas')) return 'Florestas'
  if (pathname.includes('/employees')) return 'Funcionários'
  return 'Fornecedor'
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export default function PortalDashboard() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const location = useLocation()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const [selectedDef, setSelectedDef] = useState<DocumentDefinition | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeCategoryName = getCategoryNameFromPath(location.pathname)

  const loadData = async () => {
    if (!user) return
    try {
      const [cats, defs, docs, emps] = await Promise.all([
        getDocumentCategories(),
        getDocumentDefinitions(),
        getDocuments(),
        getEmployees(),
      ])
      setCategories(cats)
      setDefinitions(defs)
      setDocuments(docs)
      setEmployees(emps)
    } catch (e) {
      console.error('Failed to fetch data', e)
    } finally {
      setIsDataLoaded(true)
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
  if (location.pathname === '/portal' || location.pathname === '/portal/') {
    return <Navigate to="/portal/fornecedor" replace />
  }

  const activeCategory = categories.find((c) => normalize(c.name) === normalize(activeCategoryName))

  const catDefs = activeCategory
    ? definitions.filter((d) => {
        if (d.category !== activeCategory.id) return false
        const target = d.target_person_type || 'Both'
        const uType = user?.person_type || 'PF'
        if (target === 'Both') return true
        return target === uType
      })
    : []

  let totalDefs = 0
  let approvedDefs = 0

  if (activeCategoryName === 'Funcionários') {
    employees.forEach((emp) => {
      const empDefs = catDefs.filter(
        (d) => !d.target_role || d.target_role === 'all' || d.target_role === emp.role,
      )
      totalDefs += empDefs.length
      empDefs.forEach((d) => {
        const doc = documents.find((doc) => doc.definition === d.id && doc.employee === emp.id)
        if (doc?.status === 'Approved') approvedDefs++
      })
    })
  } else {
    totalDefs = catDefs.length
    approvedDefs = catDefs.filter(
      (d) =>
        documents.find((doc) => doc.definition === d.id && (!doc.employee || doc.employee === ''))
          ?.status === 'Approved',
    ).length
  }

  const progress = totalDefs > 0 ? (approvedDefs / totalDefs) * 100 : 0

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
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock,
        }
      case 'Rejected':
        return {
          label: 'Rejeitado',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: XCircle,
        }
      case 'Missing':
      default:
        return {
          label: 'Pendente de Envio',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertCircle,
        }
    }
  }

  const openUploadModal = (def: DocumentDefinition, employee?: any) => {
    setSelectedDef(def)
    setSelectedEmployee(employee || null)
    setNewFile(null)
    setErrorMsg(null)
    setIsCreateOpen(true)
  }

  const handleCreateDocument = async () => {
    if (!selectedDef) return
    if (!newFile) {
      setErrorMsg('Por favor, selecione o arquivo.')
      return
    }

    setIsUploading(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('title', selectedDef.name)
      formData.append('file', newFile)
      formData.append('status', 'Pending')
      formData.append('user', user.id)
      formData.append('definition', selectedDef.id)
      if (selectedEmployee) {
        formData.append('employee', selectedEmployee.id)
      }

      await createDocument(formData)
      toast({ title: 'Documento enviado com sucesso!' })
      setIsCreateOpen(false)
      setSelectedDef(null)
      setSelectedEmployee(null)
      setNewFile(null)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar documento')
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setIsUploading(false)
    }
  }

  const renderDefRow = (def: DocumentDefinition, doc: any, employee?: any) => {
    const status = doc ? doc.status : 'Missing'
    const info = getStatusInfo(status)
    const dateStr = doc?.created ? format(new Date(doc.created), 'dd/MM/yyyy') : '-'

    return (
      <div
        key={def.id}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-md bg-background hover:bg-muted/10 transition-colors"
      >
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-base text-foreground">{def.name}</h4>
            {def.is_mandatory && (
              <Badge
                variant="destructive"
                className="text-[10px] h-5 px-1.5 bg-rose-500/10 text-rose-600 border-none hover:bg-rose-500/20"
              >
                Obrigatório
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {def.validity_days ? (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Validade: {def.validity_days} dias
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Validade: Indeterminada
              </span>
            )}
            {doc && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Enviado em: {dateStr}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className={cn('px-2.5 py-1 gap-1.5 font-medium', info.color)}>
            <info.icon className="w-3.5 h-3.5" />
            {info.label}
          </Badge>

          {(status === 'Missing' || status === 'Rejected') && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => openUploadModal(def, employee)}
            >
              <UploadCloud className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">Anexar</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-1/3 shrink-0 flex flex-col items-center text-center justify-center p-6 border-blue-100 bg-blue-50/30">
          <CardTitle className="mb-6 text-xl">Status do Cadastro</CardTitle>
          {/* @ts-expect-error CircularProgress props compatibility */}
          <CircularProgress value={progress} size={160} strokeWidth={14} className="mb-6" />
          <p className="text-sm text-muted-foreground px-4">
            {activeCategoryName === 'Funcionários'
              ? 'Envie todos os documentos obrigatórios dos seus funcionários.'
              : 'Envie todos os documentos obrigatórios para concluir a homologação.'}
          </p>
        </Card>

        <Card className="flex-1 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Requisitos: {activeCategoryName}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span>
                  Fornecedor:{' '}
                  <strong className="text-foreground">{user?.name || user?.email}</strong>
                </span>
                {user?.tax_id && (
                  <span>
                    {user?.person_type === 'PF' ? 'CPF' : 'CNPJ'}:{' '}
                    <strong className="text-foreground">{user.tax_id}</strong>
                  </span>
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            {!isDataLoaded ? (
              <div className="text-center py-8 text-muted-foreground">Carregando requisitos...</div>
            ) : !activeCategory ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento exigido para esta categoria.</p>
              </div>
            ) : activeCategoryName === 'Funcionários' ? (
              employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum funcionário cadastrado.</p>
                </div>
              ) : (
                <Accordion
                  type="multiple"
                  className="w-full space-y-4"
                  defaultValue={employees.map((e) => e.id)}
                >
                  {employees.map((employee) => {
                    const empDefs = catDefs.filter(
                      (d) =>
                        !d.target_role ||
                        d.target_role === 'all' ||
                        d.target_role === employee.role,
                    )

                    return (
                      <AccordionItem
                        value={employee.id}
                        key={employee.id}
                        className="border rounded-lg bg-card shadow-sm px-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{employee.name}</span>
                            <Badge variant="secondary" className="ml-2 uppercase text-[10px]">
                              {employee.role}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-4">
                          {empDefs.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                              Nenhum documento exigido para este cargo.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {empDefs.map((def) => {
                                const doc = documents.find(
                                  (d) => d.definition === def.id && d.employee === employee.id,
                                )
                                return renderDefRow(def, doc, employee)
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )
            ) : catDefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento exigido para esta categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catDefs.map((def) => {
                  const doc = documents.find(
                    (d) => d.definition === def.id && (!d.employee || d.employee === ''),
                  )
                  return renderDefRow(def, doc)
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setSelectedDef(null)
            setSelectedEmployee(null)
            setNewFile(null)
            setErrorMsg(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Documento</DialogTitle>
            <DialogDescription>
              Requisito: <strong className="text-foreground">{selectedDef?.name}</strong>
              {selectedEmployee && (
                <>
                  <br />
                  Funcionário: <strong className="text-foreground">{selectedEmployee.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {errorMsg && (
              <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md">
                {errorMsg}
              </div>
            )}

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
