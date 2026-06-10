import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, XCircle, FileUp, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { StatusBadge } from '@/components/StatusBadge'

export default function SupplierDocuments() {
  const { user } = useAuth()
  const [definitions, setDefinitions] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user) return
    try {
      const [defsRes, docsRes] = await Promise.all([
        pb.collection('document_definitions').getFullList({
          sort: '-is_mandatory,name',
        }),
        pb.collection('documents').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        }),
      ])

      const userPersonType = user.person_type || 'PJ'
      const filteredDefs = defsRes.filter(
        (def) =>
          !def.target_person_type ||
          def.target_person_type === 'Both' ||
          def.target_person_type === userPersonType,
      )

      setDefinitions(filteredDefs)
      setDocuments(docsRes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('documents', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getLatestDoc = (defId: string) => {
    return documents.find((d) => d.definition === defId)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e envie os documentos necessários para a sua conformidade.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {definitions.map((def) => {
          const doc = getLatestDoc(def.id)
          const status = doc?.status?.toLowerCase() || 'missing'

          return (
            <Card key={def.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-lg leading-tight">{def.name}</CardTitle>
                  {def.is_mandatory && (
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary">
                      Obrigatório
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm mt-1">
                  Formatos aceitos: {def.allowed_formats || 'Todos'}
                </CardDescription>
              </CardHeader>

              <CardContent className="mt-auto pt-0 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    {status === 'missing' ? (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground gap-1.5 font-medium"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Não Enviado
                      </Badge>
                    ) : (
                      <StatusBadge
                        status={
                          status === 'pending'
                            ? 'pendente'
                            : status === 'approved'
                              ? 'aprovado'
                              : 'rejeitado'
                        }
                      />
                    )}
                  </div>

                  {status === 'rejeitado' && doc?.rejection_reason && (
                    <div className="text-sm p-2.5 bg-rose-50 text-rose-800 rounded-md border border-rose-100 flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{doc.rejection_reason}</span>
                    </div>
                  )}
                </div>

                <Button
                  asChild
                  variant={status === 'approved' ? 'outline' : 'default'}
                  className="w-full justify-between group mt-2"
                >
                  <Link to={`/portal/upload/${def.id}`}>
                    {status === 'approved' ? 'Visualizar ou Reenviar' : 'Fazer Upload'}
                    {status === 'approved' ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <FileUp className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
