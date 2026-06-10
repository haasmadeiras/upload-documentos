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
import { Textarea } from '@/components/ui/textarea'
import {
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  Contract,
} from '@/services/contracts'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminContracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    contract_number: '',
    description: '',
    start_date: '',
    end_date: '',
  })

  const load = async () => {
    try {
      const data = await getContracts()
      setContracts(data)
    } catch (e) {
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenDialog = (c?: Contract) => {
    if (c) {
      setEditingId(c.id)
      setFormData({
        contract_number: c.contract_number,
        description: c.description || '',
        start_date: c.start_date ? c.start_date.split(' ')[0] : '',
        end_date: c.end_date ? c.end_date.split(' ')[0] : '',
      })
    } else {
      setEditingId(null)
      setFormData({ contract_number: '', description: '', start_date: '', end_date: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      }

      if (editingId) {
        await updateContract(editingId, payload as any)
        toast.success('Atualizado com sucesso')
      } else {
        await createContract(payload as any)
        toast.success('Criado com sucesso')
      }
      setIsDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este contrato?')) return
    try {
      await deleteContract(id)
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
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Contratados</h1>
          <p className="text-muted-foreground">Gerencie os contratos de prestação de serviços.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhum contrato.
                  </TableCell>
                </TableRow>
              )}
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.contract_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={c.description}>
                    {c.description}
                  </TableCell>
                  <TableCell>
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : '-'} até{' '}
                    {c.end_date ? new Date(c.end_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id)}
                        className="text-destructive"
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
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número do Contrato</Label>
              <Input
                value={formData.contract_number}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!formData.contract_number}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
