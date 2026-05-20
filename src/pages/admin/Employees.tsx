import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCPF, isValidCPF } from '@/lib/utils'
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
  DialogFooter,
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
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
} from '@/services/employees'
import { getUsers, User } from '@/services/users'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cpfTouched, setCpfTouched] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    role: 'motorista',
    user: '',
  })

  const load = async () => {
    try {
      const data = await getEmployees()
      setEmployees(data)
      const usersData = await getUsers('isAdmin = false')
      setUsers(usersData)
    } catch (e) {
      toast.error('Erro ao carregar funcionários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenDialog = (emp?: Employee) => {
    if (emp) {
      setEditingId(emp.id)
      setFormData({
        name: emp.name,
        tax_id: formatCPF(emp.tax_id),
        role: emp.role,
        user: emp.user,
      })
    } else {
      setEditingId(null)
      setFormData({ name: '', tax_id: '', role: 'motorista', user: '' })
    }
    setCpfTouched(false)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const dataToSave = { ...formData, tax_id: formData.tax_id.replace(/\D/g, '') }
      if (editingId) {
        await updateEmployee(editingId, dataToSave as any)
        toast.success('Atualizado com sucesso')
      } else {
        await createEmployee(dataToSave as any)
        toast.success('Criado com sucesso')
      }
      setIsDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar')
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-muted-foreground">
            Visão geral de todos os funcionários de todos os fornecedores.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Funcionário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {emp.expand?.user?.name || emp.expand?.user?.email || 'Desconhecido'}
                  </TableCell>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{formatCPF(emp.tax_id)}</TableCell>
                  <TableCell className="capitalize">{emp.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(emp)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(emp.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={formData.user}
                onValueChange={(val) => setFormData({ ...formData, user: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={formData.tax_id}
                onChange={(e) => {
                  setFormData({ ...formData, tax_id: formatCPF(e.target.value) })
                  setCpfTouched(true)
                }}
                onBlur={() => setCpfTouched(true)}
                maxLength={14}
              />
              {cpfTouched && formData.tax_id.length > 0 && !isValidCPF(formData.tax_id) && (
                <p className="text-sm text-destructive">CPF inválido</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorista">Motorista</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={
                !formData.name || !formData.user || !formData.role || !isValidCPF(formData.tax_id)
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
