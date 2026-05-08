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
  getForestAreas,
  createForestArea,
  updateForestArea,
  deleteForestArea,
  ForestArea,
} from '@/services/forest_areas'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminForests() {
  const [forests, setForests] = useState<ForestArea[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    location: '',
  })

  const load = async () => {
    try {
      const data = await getForestAreas()
      setForests(data)
    } catch (e) {
      toast.error('Erro ao carregar florestas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenDialog = (f?: ForestArea) => {
    if (f) {
      setEditingId(f.id)
      setFormData({
        name: f.name,
        registration_number: f.registration_number || '',
        location: f.location || '',
      })
    } else {
      setEditingId(null)
      setFormData({ name: '', registration_number: '', location: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateForestArea(editingId, formData)
        toast.success('Atualizado com sucesso')
      } else {
        await createForestArea(formData)
        toast.success('Criado com sucesso')
      }
      setIsDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Erro ao salvar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta floresta?')) return
    try {
      await deleteForestArea(id)
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
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Florestas</h1>
          <p className="text-muted-foreground">Gerencie as áreas florestais e matrículas.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Nova Floresta
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forests.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhuma floresta.
                  </TableCell>
                </TableRow>
              )}
              {forests.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.registration_number}</TableCell>
                  <TableCell>{f.location}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(f.id)}
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
            <DialogTitle>{editingId ? 'Editar' : 'Nova'} Floresta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número da Matrícula</Label>
              <Input
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!formData.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
