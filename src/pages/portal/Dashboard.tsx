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
import { UploadCloud, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getDocumentCategories, DocumentCategory } from '@/services/document_categories'
import { getDocumentDefinitions, DocumentDefinition } from '@/services/document_definitions'
import { getDocuments } from '@/services/documents'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'

export default function PortalDashboard() {
  const { user } = useAuth()
  const location = useLocation()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [userDocs, setUserDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (!activeName) {
    const totalDocs = userDocs.length
    const pendingDocs = userDocs.filter((d) => d.status === 'Pending').length
    const approvedDocs = userDocs.filter((d) => d.status === 'Approved').length
    const rejectedDocs = userDocs.filter((d) => d.status === 'Rejected').length

    const recentDocs = [...userDocs]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5)

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Resumo dos seus documentos e atividades recentes.
          </p>
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

        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Documentos Recentes</CardTitle>
            <CardDescription>Os 5 últimos documentos enviados no sistema.</CardDescription>
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
                            {doc.status === 'Approved' ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                Aprovado
                              </Badge>
                            ) : doc.status === 'Rejected' ? (
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant="destructive">Rejeitado</Badge>
                                {doc.rejection_reason && (
                                  <span
                                    className="text-xs text-rose-600 max-w-[200px] leading-tight line-clamp-2"
                                    title={doc.rejection_reason}
                                  >
                                    {doc.rejection_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Pendente
                              </Badge>
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

    return true
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Checklist: {activeCategory.name}</h1>
        <p className="text-muted-foreground mt-1">
          Envie e gerencie os documentos obrigatórios para esta categoria.
        </p>
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
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 mr-1" /> Pendente
              </Badge>
            )
            if (doc) {
              if (doc.status === 'Approved')
                statusEl = (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado
                  </Badge>
                )
              else if (doc.status === 'Rejected')
                statusEl = (
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" /> Rejeitado
                    </Badge>
                    {doc.rejection_reason && (
                      <span className="text-xs text-rose-600 max-w-[200px] text-right leading-tight">
                        {doc.rejection_reason}
                      </span>
                    )}
                  </div>
                )
              else
                statusEl = (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Clock className="w-3 h-3 mr-1" /> Em Análise
                  </Badge>
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
                    <Button variant={doc ? 'outline' : 'default'} size="sm" asChild>
                      <Link to={`/portal/upload/${def.id}`}>
                        <UploadCloud className="w-4 h-4 mr-2" />
                        {doc ? 'Atualizar Arquivo' : 'Enviar Arquivo'}
                      </Link>
                    </Button>
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
