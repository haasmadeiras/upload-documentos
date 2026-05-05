import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import useAppStore from '@/stores/use-app-store'
import { useToast } from '@/hooks/use-toast'

export default function AdminConfig() {
  const { requirements, addRequirement } = useAppStore()
  const { toast } = useToast()
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isMandatory, setIsMandatory] = useState(true)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    addRequirement({
      title: newTitle,
      description: newDesc,
      isMandatory,
      categoryId: 'fornecedor-ti',
    })
    setNewTitle('')
    setNewDesc('')
    toast({
      title: 'Requisito adicionado',
      description: `O documento ${newTitle} foi adicionado à categoria.`,
    })
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categoria: Fornecedor de TI</h2>
          <p className="text-muted-foreground mt-1">
            Configure os documentos exigidos para este perfil de stakeholder.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px] items-start">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Documentos Exigidos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Obrigatoriedade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((req) => (
                  <TableRow key={req.id} className="group">
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab opacity-50 group-hover:opacity-100" />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{req.title}</div>
                      <div className="text-xs text-muted-foreground">{req.description}</div>
                    </TableCell>
                    <TableCell>
                      {req.isMandatory ? (
                        <Badge variant="default" className="bg-primary">
                          Obrigatório
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Opcional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg">Novo Requisito</CardTitle>
            <CardDescription>Adicione um novo documento à lista.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Documento</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Contrato Social"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Descrição / Instruções</Label>
                <Input
                  id="desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Cópia autenticada..."
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="mandatory" className="cursor-pointer">
                  Obrigatório
                </Label>
                <Switch id="mandatory" checked={isMandatory} onCheckedChange={setIsMandatory} />
              </div>
              <Button type="submit" className="w-full mt-4 bg-accent hover:bg-accent/90 text-white">
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
