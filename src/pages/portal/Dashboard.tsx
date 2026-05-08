import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UploadCloud, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getDocumentCategories, DocumentCategory } from '@/services/document_categories'
import { getDocumentDefinitions, DocumentDefinition } from '@/services/document_definitions'
import { getDocuments } from '@/services/documents'
import { Skeleton } from '@/components/ui/skeleton'

export default function PortalDashboard() {
  const { user } = useAuth()
  const location = useLocation()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [userDocs, setUserDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, defs, docs] = await Promise.all([
          getDocumentCategories(),
          getDocumentDefinitions(),
          getDocuments(`user = "${user?.id}"`),
        ])
        setCategories(cats)
        setDefinitions(defs)
        setUserDocs(docs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) load()
  }, [user])

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
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!activeName) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Bem-vindo ao Portal</h1>
        <p className="text-muted-foreground">
          Selecione uma categoria no menu lateral para enviar seus documentos.
        </p>
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

  const categoryDefs = definitions.filter((d) => d.category === activeCategory.id)

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
              <Badge variant="outline" className="bg-slate-100">
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
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" /> Rejeitado
                  </Badge>
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
