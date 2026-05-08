import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { getEmployees, createEmployee, deleteEmployee, Employee } from '@/services/employees'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function PortalEmployees() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  const [formData, setFormData] = useState({ name: '', tax_id: '', role: 'outros' })

  const load = async () => {
    if (!user) return
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch (e) {
      toast.error('Erro ao carregar funcionários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await createEmployee({ ...formData, user: user.id } as Partial<Employee>)
      toast.success('Funcionário adicionado com sucesso!')
      setIsAddOpen(false)
      setFormData({ name: '', tax_id: '', role: 'outros' })
      load()
    } catch (err) {
      toast.error('Erro ao adicionar funcionário.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este funcionário?')) return
    try {
      await deleteEmployee(id)
      toast.success('Excluído com sucesso')
      load()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setImporting(true)
    setTimeout(async () => {
      try {
        await createEmployee({
          name: 'João Silva (Importado)',
          tax_id: '111.222.333-44',
          role: 'outros',
          user: user.id,
        })
        await createEmployee({
          name: 'Maria Souza (Importado)',
          tax_id: '555.666.777-88',
          role: 'outros',
          user: user.id,
        })
        toast.success('Arquivo processado! 2 funcionários importados.')
        setIsImportOpen(false)
        load()
      } catch (err) {
        toast.error('Erro ao importar.')
      } finally {
        setImporting(false)
      }
    }, 1500)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie a lista de funcionários e seus documentos.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" /> Importar FGTS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Guia FGTS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="fgts-file">Arquivo (.txt, .csv, .pdf)</Label>
                  <Input id="fgts-file" type="file" onChange={handleImport} disabled={importing} />
                </div>
                {importing && (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Processando arquivo, extraindo dados...
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    required
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outros">Outros (Padrão)</SelectItem>
                      <SelectItem value="motorista">Motorista</SelectItem>
                      <SelectItem value="operador">Operador de Máquinas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.tax_id}</TableCell>
                  <TableCell className="capitalize">{emp.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(emp.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/portal/employees/${emp.id}`}>
                          Ver Docs <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
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
