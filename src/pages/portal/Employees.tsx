import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, ArrowRight, Trash2, Pencil, Users } from 'lucide-react'
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
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
} from '@/services/employees'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { isValidCPF } from '@/lib/utils'
import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker'

try {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()
} catch (e) {
  console.error('Falha ao inicializar o worker do PDF', e)
}

const formatCpf = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cpf
}

export default function PortalEmployees() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  const [formData, setFormData] = useState({ name: '', tax_id: '', role: 'outros' })
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)

  const addTaxIdCleaned = formData.tax_id.replace(/\D/g, '')
  const addCpfInvalid = addTaxIdCleaned.length === 11 && !isValidCPF(addTaxIdCleaned)
  const isAddSubmitDisabled = addTaxIdCleaned.length !== 11 || !isValidCPF(addTaxIdCleaned)

  const editTaxIdCleaned = editingEmp?.tax_id.replace(/\D/g, '') || ''
  const editCpfInvalid = editTaxIdCleaned.length === 11 && !isValidCPF(editTaxIdCleaned)
  const isEditSubmitDisabled = editTaxIdCleaned.length !== 11 || !isValidCPF(editTaxIdCleaned)

  const load = async () => {
    if (!user) return
    try {
      const data = await getEmployees(`user = "${user.id}"`)
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

  useRealtime('employees', () => {
    load()
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await createEmployee({
        ...formData,
        tax_id: formData.tax_id.replace(/\D/g, ''),
        user: user.id,
      } as Partial<Employee>)
      toast.success('Funcionário adicionado com sucesso!')
      setIsAddOpen(false)
      setFormData({ name: '', tax_id: '', role: 'outros' })
      load()
    } catch (err) {
      toast.error('Erro ao adicionar funcionário.')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmp) return
    try {
      await updateEmployee(editingEmp.id, {
        name: editingEmp.name,
        tax_id: editingEmp.tax_id.replace(/\D/g, ''),
        role: editingEmp.role,
      })
      toast.success('Funcionário atualizado com sucesso!')
      setEditingEmp(null)
      load()
    } catch (err) {
      toast.error('Erro ao atualizar funcionário.')
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

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Formato de arquivo inválido. Por favor, envie apenas arquivos PDF.')
      e.target.value = ''
      return
    }

    setImporting(true)

    try {
      const arrayBuffer = await file.arrayBuffer()

      let pdf
      try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      } catch (pdfErr) {
        toast.error('Falha ao abrir o PDF. O arquivo pode estar corrompido ou protegido.')
        return
      }

      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
        fullText += pageText + '\n'
      }

      if (!fullText.trim()) {
        toast.error('Nenhum texto pôde ser extraído do documento PDF.')
        return
      }

      const res = await pb.send('/backend/v1/employees/import-fgts', {
        method: 'POST',
        body: JSON.stringify({ text: fullText }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.count > 0) {
        toast.success(`Arquivo processado! ${res.count} funcionários novos importados.`)
        toast.warning(
          'Os cadastros realizados automaticamente pela importação da guia do FGTS devem ser revisados para que seja feito o ajuste do campo FUNÇÃO.',
          { duration: 10000 },
        )
      } else {
        toast.success('Arquivo processado. Os funcionários encontrados já estavam cadastrados.')
      }
      setIsImportOpen(false)
      load()
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || 'Erro ao importar. Tente novamente.'
      toast.error(msg)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
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
                <Upload className="w-4 h-4 mr-2" /> Importar Guia FGTS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Guia FGTS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="fgts-file">Arquivo FGTS (.pdf)</Label>
                  <Input
                    id="fgts-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleImport}
                    disabled={importing}
                  />
                </div>
                {importing && (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Processando arquivo, extraindo e validando dados...
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
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '')
                      if (val.length > 11) val = val.slice(0, 11)
                      if (val.length > 9)
                        val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
                      else if (val.length > 6)
                        val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
                      else if (val.length > 3) val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2')
                      setFormData({ ...formData, tax_id: val })
                    }}
                    placeholder="000.000.000-00"
                  />
                  {addCpfInvalid && (
                    <p className="text-sm font-medium text-destructive">CPF inválido</p>
                  )}
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
                <Button type="submit" className="w-full" disabled={isAddSubmitDisabled}>
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : employees.length}</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingEmp} onOpenChange={(v) => !v && setEditingEmp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          {editingEmp && (
            <form onSubmit={handleEdit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  required
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  required
                  value={editingEmp.tax_id}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '')
                    if (val.length > 11) val = val.slice(0, 11)
                    if (val.length > 9)
                      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
                    else if (val.length > 6)
                      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
                    else if (val.length > 3) val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2')
                    setEditingEmp({ ...editingEmp, tax_id: val })
                  }}
                />
                {editCpfInvalid && (
                  <p className="text-sm font-medium text-destructive">CPF inválido</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Função</Label>{' '}
                <Select
                  value={editingEmp.role}
                  onValueChange={(v: any) => setEditingEmp({ ...editingEmp, role: v })}
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
              <Button type="submit" className="w-full" disabled={isEditSubmitDisabled}>
                Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                  <TableCell>{formatCpf(emp.tax_id)}</TableCell>
                  <TableCell className="capitalize">{emp.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingEmp({ ...emp, tax_id: formatCpf(emp.tax_id) })}
                        className="text-muted-foreground hover:text-primary"
                      >
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
