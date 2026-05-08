import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
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
import { getUsers, createUser, updateUser, deleteUser, User } from '@/services/users'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminSuppliers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tax_id: '',
    person_type: 'PJ',
    password: '',
  })

  const load = async () => {
    try {
      const data = await getUsers('isAdmin = false')
      setUsers(data)
    } catch (e) {
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingId(user.id)
      setFormData({
        name: user.name || '',
        email: user.email || '',
        tax_id: user.tax_id || '',
        person_type: user.person_type || 'PJ',
        password: '',
      })
    } else {
      setEditingId(null)
      setFormData({ name: '', email: '', tax_id: '', person_type: 'PJ', password: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        tax_id: formData.tax_id,
        person_type: formData.person_type,
      }

      if (formData.password) {
        payload.password = formData.password
        payload.passwordConfirm = formData.password
      }

      if (editingId) {
        await updateUser(editingId, payload)
        toast.success('Atualizado com sucesso')
      } else {
        if (!formData.password) {
          toast.error('Senha é obrigatória para novo fornecedor')
          return
        }
        payload.isAdmin = false
        await createUser(payload)
        toast.success('Criado com sucesso')
      }
      setIsDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar fornecedor. Verifique os dados e tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este fornecedor?')) return
    try {
      await deleteUser(id)
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
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie os fornecedores cadastrados no sistema.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum fornecedor cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.tax_id}</TableCell>
                  <TableCell>{u.person_type}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(u.id)}
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
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome / Razão Social</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Pessoa</Label>
                <Select
                  value={formData.person_type}
                  onValueChange={(val) => setFormData({ ...formData, person_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Física (PF)</SelectItem>
                    <SelectItem value="PJ">Jurídica (PJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{editingId ? 'Nova Senha (opcional)' : 'Senha'}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={!formData.email || (!editingId && !formData.password)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
