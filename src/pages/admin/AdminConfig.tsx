import { useState } from 'react'
import { Plus, MoreVertical, GripVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface DocRule {
  id: string
  title: string
  category: string
  mandatory: boolean
  expires: boolean
}

export default function AdminConfig() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [documents, setDocuments] = useState<DocRule[]>([
    {
      id: '1',
      title: 'Contrato Social Consolidado',
      category: 'Todos',
      mandatory: true,
      expires: false,
    },
    {
      id: '2',
      title: 'Certidão Negativa de Débitos (CND)',
      category: 'Todos',
      mandatory: true,
      expires: true,
    },
    {
      id: '3',
      title: 'Comprovante de Inscrição Municipal',
      category: 'Prestador de Serviços',
      mandatory: true,
      expires: true,
    },
    {
      id: '4',
      title: 'Acordo de Confidencialidade (NDA)',
      category: 'Fornecedor de TI',
      mandatory: false,
      expires: false,
    },
  ])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsDialogOpen(false)
    toast.success('Regra de documento salva com sucesso!')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Requisitos de Cadastro</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie quais documentos os fornecedores precisam enviar.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
                <DialogDescription>
                  Configure uma nova regra de exigência de documento.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Documento</Label>
                  <Input id="name" placeholder="Ex: Alvará de Funcionamento" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria Aplicável</Label>
                  <Select defaultValue="todos">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Stakeholders</SelectItem>
                      <SelectItem value="ti">Fornecedor de TI</SelectItem>
                      <SelectItem value="servicos">Prestador de Serviços</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Obrigatório</Label>
                    <p className="text-xs text-muted-foreground">Bloqueia aprovação se faltar</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Controlar Validade</Label>
                    <p className="text-xs text-muted-foreground">Usuário deve informar expiração</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Regra</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Construtor de Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Público Alvo</TableHead>
                <TableHead>Configurações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab hover:text-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {doc.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {doc.mandatory && (
                        <Badge
                          variant="outline"
                          className="border-blue-200 text-blue-700 bg-blue-50"
                        >
                          Obrigatório
                        </Badge>
                      )}
                      {doc.expires && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 text-amber-700 bg-amber-50"
                        >
                          Tem Validade
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar Requisito</DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
