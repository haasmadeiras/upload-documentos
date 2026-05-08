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
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  Vehicle,
} from '@/services/vehicles'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
  })

  const load = async () => {
    try {
      const data = await getVehicles()
      setVehicles(data)
    } catch (e) {
      toast.error('Erro ao carregar veículos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenDialog = (v?: Vehicle) => {
    if (v) {
      setEditingId(v.id)
      setFormData({
        plate: v.plate,
        model: v.model,
        brand: v.brand,
        year: v.year || new Date().getFullYear(),
      })
    } else {
      setEditingId(null)
      setFormData({ plate: '', model: '', brand: '', year: new Date().getFullYear() })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateVehicle(editingId, formData)
        toast.success('Atualizado com sucesso')
      } else {
        await createVehicle(formData)
        toast.success('Criado com sucesso')
      }
      setIsDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este veículo?')) return
    try {
      await deleteVehicle(id)
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
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Veículos</h1>
          <p className="text-muted-foreground">
            Controle a frota de veículos cadastrados no sistema.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Veículo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhum veículo.
                  </TableCell>
                </TableRow>
              )}
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium uppercase">{v.plate}</TableCell>
                  <TableCell>
                    {v.brand} {v.model}
                  </TableCell>
                  <TableCell>{v.year}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(v)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(v.id)}
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
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Veículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!formData.plate}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
