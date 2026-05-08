import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getDocumentCategories, DocumentCategory } from '@/services/document_categories'
import {
  getDocumentDefinitions,
  createDocumentDefinition,
  updateDocumentDefinition,
  deleteDocumentDefinition,
  DocumentDefinition,
} from '@/services/document_definitions'
import { useRealtime } from '@/hooks/use-realtime'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Pencil, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function AdminConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDef, setEditingDef] = useState<DocumentDefinition | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    is_mandatory: true,
    validity_days: 0,
    allowed_formats: 'pdf, jpg, png',
  })

  const loadData = async () => {
    try {
      const cats = await getDocumentCategories()
      setCategories(cats)
      if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0].id)

      const defs = await getDocumentDefinitions()
      setDefinitions(defs)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('document_definitions', () => {
    loadData()
  })
  useRealtime('document_categories', () => {
    loadData()
  })

  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        Acesso negado. Apenas administradores podem acessar esta página.
      </div>
    )
  }

  const handleOpenDialog = (def?: DocumentDefinition) => {
    if (def) {
      setEditingDef(def)
      setFormData({
        name: def.name,
        is_mandatory: def.is_mandatory,
        validity_days: def.validity_days || 0,
        allowed_formats: def.allowed_formats || '',
      })
    } else {
      setEditingDef(null)
      setFormData({
        name: '',
        is_mandatory: true,
        validity_days: 0,
        allowed_formats: 'pdf, jpg, png',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        category: selectedCategory,
        validity_days: Number(formData.validity_days),
      }

      if (editingDef) {
        await updateDocumentDefinition(editingDef.id, payload)
        toast({ title: 'Requisito atualizado com sucesso' })
      } else {
        await createDocumentDefinition(payload)
        toast({ title: 'Requisito criado com sucesso' })
      }
      setIsDialogOpen(false)
    } catch (err) {
      const errors = extractFieldErrors(err)
      toast({
        title: 'Erro ao salvar',
        description: Object.values(errors).join(', ') || 'Verifique os dados e tente novamente',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este requisito?')) return
    try {
      await deleteDocumentDefinition(id)
      toast({ title: 'Requisito excluído' })
    } catch (err) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regras e Requisitos</h1>
          <p className="text-muted-foreground mt-1">
            Configure os documentos exigidos para cada categoria de classificação.
          </p>
        </div>
      </div>

      {categories.length > 0 ? (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto border-b bg-transparent space-x-2 pb-px rounded-none">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-blue-500" />
                  Requisitos para {cat.name}
                </h3>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Documento
                </Button>
              </div>

              <div className="grid gap-3">
                {definitions.filter((d) => d.category === cat.id).length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground bg-slate-50/50">
                    Nenhum requisito configurado para esta categoria.
                  </div>
                ) : (
                  definitions
                    .filter((d) => d.category === cat.id)
                    .map((def) => (
                      <Card
                        key={def.id}
                        className="shadow-sm border-border hover:border-blue-200 transition-colors"
                      >
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{def.name}</h4>
                              {def.is_mandatory && (
                                <Badge
                                  variant="destructive"
                                  className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200"
                                >
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                Validade:{' '}
                                <strong className="text-slate-700">
                                  {def.validity_days > 0
                                    ? `${def.validity_days} dias`
                                    : 'Indeterminado'}
                                </strong>
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                Formatos:{' '}
                                <strong className="text-slate-700">
                                  {def.allowed_formats || '*'}
                                </strong>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(def)}
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(def.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          Carregando categorias...
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingDef ? 'Editar' : 'Adicionar'} Requisito de Documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Documento</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: CNH, CRLV, Contrato Social"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity_days">Validade em Dias (0 para indeterminado)</Label>
              <Input
                id="validity_days"
                type="number"
                min="0"
                value={formData.validity_days}
                onChange={(e) =>
                  setFormData({ ...formData, validity_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowed_formats">Formatos Permitidos</Label>
              <Input
                id="allowed_formats"
                value={formData.allowed_formats}
                onChange={(e) => setFormData({ ...formData, allowed_formats: e.target.value })}
                placeholder="Ex: pdf, jpg, png"
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 mt-2">
              <div className="space-y-0.5">
                <Label>Documento Obrigatório</Label>
                <p className="text-xs text-muted-foreground">
                  Bloqueia aprovação do cadastro se ausente.
                </p>
              </div>
              <Switch
                checked={formData.is_mandatory}
                onCheckedChange={(c) => setFormData({ ...formData, is_mandatory: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              Salvar Requisito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
