import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/use-auth'
import { getDocumentCategories, DocumentCategory } from '@/services/document_categories'
import { getDocumentDefinitions, DocumentDefinition } from '@/services/document_definitions'
import { getDocuments, downloadDocument, deleteDocument } from '@/services/documents'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'
import { StatusBadge } from '@/components/StatusBadge'

export default function PortalDashboard() {
  const { user } = useAuth()
  const location = useLocation()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [userDocs, setUserDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      toast.success('Documento excluído com sucesso.')
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir documento.')
    }
  }

  const loadData = async () => {
    if (!user?.id) return
    try {
      setError(null)
      const isAdmin = user?.isAdmin || user?.role === 'Admin'
      const filter = isAdmin ? '' : `user = "${user?.id}"`

      const [cats, defs, docs] = await Promise.all([
        getDocumentCategories(),
        getDocumentDefinitions(),
        getDocuments(filter, 'definition.category'),
      ])
      setCategories(cats)
      setDefinitions(defs)
      setUserDocs(docs)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Não foi possível carregar os dados. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime(
    'documents',
    (e) => {
      const isAdmin = user?.isAdmin || user?.role === 'Admin'
      if (isAdmin || e.record.user === user?.id) {
        loadData()
      }
    },
    !!user?.id,
  )

  // Determine current category based on route
  const getActiveCategoryName = () => {
    const path = location.pathname
    if (path.includes('fornecedor')) return 'Fornecedor'
    if (path.includes('employees')) return 'Funcionário'
    if (path.includes('veiculos')) return 'Veículos'
    if (path.includes('contratados')) return 'Contratados'
    if (path.includes('florestas')) return 'Florestas'
    return ''
  }

  const activeName = getActiveCategoryName()
  const activeCategory = categories.find((c) =>
    c.name.toLowerCase().includes(activeName.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro de Conexão</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() => {
            setLoading(true)
            loadData()
          }}
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  const getRelevantDefinitions = (defs: DocumentDefinition[]) => {
    return defs.filter((d) => {
      if (d.target_person_type && d.target_person_type !== 'Both') {
        if (user?.person_type && d.target_person_type !== user.person_type) {
          return false
        }
      }
      if (d.target_role && d.target_role !== 'all') {
        return false
      }
      return true
    })
  }

  if (!activeName) {
    const totalDocs = userDocs.length
    const pendingDocs = userDocs.filter(
      (d) => d.status === 'Pending' || d.status === 'Aguardando Aprovação',
    ).length
    const approvedDocs = userDocs.filter((d) => d.status === 'Approved').length
    const rejectedDocs = userDocs.filter((d) => d.status === 'Rejected').length

    const recentDocs = [...userDocs]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5)

    const relevantDefs = getRelevantDefinitions(definitions)
    const mandatoryDefs = relevantDefs.filter((d) => d.is_mandatory)
    const mandatoryUploaded = mandatoryDefs.filter((def) =>
      userDocs.some((doc) => doc.definition === def.id),
    )

    const progressPercentage =
      mandatoryDefs.length > 0
        ? Math.round((mandatoryUploaded.length / mandatoryDefs.length) * 100)
        : 100

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">
              Resumo dos seus documentos e atividades recentes.
            </p>
          </div>
          <Card className="w-full md:w-auto min-w-[300px] shadow-sm border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso de Compliance</span>
                <span className="text-sm text-muted-foreground">
                  {mandatoryUploaded.length} de {mandatoryDefs.length} obrigatórios
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 mb-1 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Documentos
              </CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocs}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{approvedDocs}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingDocs}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejeitados
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{rejectedDocs}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/60 flex-1 h-fit">
            <CardHeader>
              <CardTitle>Categorias de Documentos</CardTitle>
              <CardDescription>Acesse o checklist de cada categoria.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories
                  .filter((c) => {
                    const cDefs = relevantDefs.filter((d) => d.category === c.id)
                    return cDefs.length > 0
                  })
                  .map((category) => {
                    const cDefs = relevantDefs.filter((d) => d.category === category.id)
                    const cMandatory = cDefs.filter((d) => d.is_mandatory)
                    const cUploaded = cMandatory.filter((def) =>
                      userDocs.some((doc) => doc.definition === def.id),
                    )
                    const progress =
                      cMandatory.length > 0
                        ? Math.round((cUploaded.length / cMandatory.length) * 100)
                        : 100

                    let path = '/portal'
                    const nameLower = category.name.toLowerCase()
                    if (nameLower.includes('fornecedor')) path = '/portal/fornecedor'
                    else if (nameLower.includes('veículo') || nameLower.includes('veiculo'))
                      path = '/portal/veiculos'
                    else if (nameLower.includes('floresta')) path = '/portal/florestas'
                    else if (nameLower.includes('contratado')) path = '/portal/contratados'
                    else if (nameLower.includes('funcionário') || nameLower.includes('funcionario'))
                      path = '/portal/employees'

                    return (
                      <Link key={category.id} to={path} className="block group">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 hover:bg-secondary/20 transition-all">
                          <div className="space-y-1">
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {category.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cUploaded.length} de {cMandatory.length} obrigatórios enviados
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                              {progress}%
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 flex-1">
            <CardHeader>
              <CardTitle>Documentos Recentes</CardTitle>
              <CardDescription>Últimos documentos enviados no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 opacity-50" />
                  <p>Nenhum documento encontrado.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDocs.map((doc) => {
                        const isVide = doc.expand?.definition?.is_vide_documento
                        const catName =
                          doc.expand?.definition?.expand?.category?.name || 'Sem categoria'
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {doc.title}
                                {isVide && (
                                  <Badge variant="outline" className="text-[10px] bg-slate-50">
                                    Vide Documento
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{catName}</TableCell>
                            <TableCell>
                              <StatusBadge status={doc.status} />
                              {doc.status === 'Rejected' && doc.rejection_reason && (
                                <span
                                  className="text-xs text-rose-600 block mt-1 max-w-[200px] leading-tight line-clamp-2"
                                  title={doc.rejection_reason}
                                >
                                  {doc.rejection_reason}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(doc.created).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => downloadDocument(doc)}
                                  title="Baixar Documento"
                                >
                                  <Download className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Excluir Documento">
                                      <Trash2 className="w-4 h-4 text-rose-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o documento "{doc.title}"?
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(doc.id)}
                                        className="bg-rose-500 text-white hover:bg-rose-600"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!activeCategory) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-muted-foreground">
        Categoria "{activeName}" não encontrada no sistema. Entre em contato com o suporte.
      </div>
    )
  }

  const categoryDefs = definitions.filter((d) => {
    if (d.category !== activeCategory.id) return false

    if (d.target_person_type && d.target_person_type !== 'Both') {
      if (user?.person_type && d.target_person_type !== user.person_type) {
        return false
      }
    }

    if (d.target_role && d.target_role !== 'all') {
      return false
    }

    return true
  })

  const categoryMandatoryDefs = categoryDefs.filter((d) => d.is_mandatory)
  const categoryMandatoryUploaded = categoryMandatoryDefs.filter((def) =>
    userDocs.some((doc) => doc.definition === def.id),
  )
  const categoryProgress =
    categoryMandatoryDefs.length > 0
      ? Math.round((categoryMandatoryUploaded.length / categoryMandatoryDefs.length) * 100)
      : 100

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checklist: {activeCategory.name}</h1>
          <p className="text-muted-foreground mt-1">
            Envie e gerencie os documentos obrigatórios para esta categoria.
          </p>
        </div>
        <Card className="w-full md:w-auto min-w-[300px] shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da Categoria</span>
              <span className="text-sm text-muted-foreground">
                {categoryMandatoryUploaded.length} de {categoryMandatoryDefs.length} obrigatórios
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5 mb-1 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${categoryProgress}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {categoryDefs.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground">
            Nenhum documento exigido para esta categoria.
          </div>
        ) : (
          categoryDefs.map((def) => {
            const doc = userDocs.find((d) => d.definition === def.id)

            let statusEl = (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-600 border-amber-200 gap-1.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Pendente
              </Badge>
            )
            if (doc) {
              statusEl = (
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={doc.status} />
                  {doc.status === 'Rejected' && doc.rejection_reason && (
                    <span className="text-xs text-rose-600 max-w-[200px] text-right leading-tight">
                      {doc.rejection_reason}
                    </span>
                  )}
                </div>
              )
            }

            return (
              <Card
                key={def.id}
                className="shadow-sm border-border/60 hover:shadow-md transition-all"
              >
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{def.name}</h3>
                      {def.is_mandatory && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] uppercase font-bold tracking-wider"
                        >
                          Obrigatório
                        </Badge>
                      )}
                      {def.is_vide_documento && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          Vide Documento
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Formatos: {def.allowed_formats || 'Qualquer'} • Validade:{' '}
                      {def.validity_days ? `${def.validity_days} dias` : 'Indeterminada'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {statusEl}
                    <div className="flex items-center gap-2">
                      <Button variant={doc ? 'outline' : 'default'} size="sm" asChild>
                        <Link to={`/portal/upload/${def.id}`}>
                          <UploadCloud className="w-4 h-4 mr-2" />
                          {doc ? 'Atualizar Arquivo' : 'Enviar Arquivo'}
                        </Link>
                      </Button>
                      {doc && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => downloadDocument(doc)}
                            title="Baixar Documento"
                          >
                            <Download className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-9 h-9 border-rose-200 hover:bg-rose-50"
                                title="Excluir Documento"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este documento?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="bg-rose-500 text-white hover:bg-rose-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
