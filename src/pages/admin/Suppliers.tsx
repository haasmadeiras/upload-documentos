import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Upload } from 'lucide-react'
import { SupplierImportDialog } from '@/components/admin/SupplierImportDialog'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  Supplier,
} from '@/services/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    tax_id: z.string().min(14, 'Documento inválido'),
    person_type: z.enum(['PF', 'PJ']),
    phone: z.string().optional(),
    legal_name: z.string().optional(),
    address: z.string().optional(),
    external_code: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const taxIdClean = data.tax_id.replace(/\D/g, '')
    if (data.person_type === 'PF' && taxIdClean.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF inválido',
        path: ['tax_id'],
      })
    }
    if (data.person_type === 'PJ' && taxIdClean.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ inválido',
        path: ['tax_id'],
      })
    }
    if (data.person_type === 'PJ' && (!data.legal_name || data.legal_name.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Razão Social é obrigatória para PJ',
        path: ['legal_name'],
      })
    }
  })

function maskTaxId(value: string, personType: 'PF' | 'PJ') {
  const raw = value.replace(/\D/g, '')
  if (personType === 'PF') {
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14)
  } else {
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .slice(0, 18)
  }
}

function maskPhone(value: string) {
  const raw = value.replace(/\D/g, '')
  if (raw.length <= 10) {
    return raw.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else {
    return raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
  }
}

export default function AdminSuppliers() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const isMaster = user?.isAdmin === true || user?.role === 'Admin' || user?.role === 'Colaborador'

  useEffect(() => {
    if (isAuthenticated && !isMaster) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isMaster, navigate])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      tax_id: '',
      person_type: 'PJ',
      phone: '',
      legal_name: '',
    },
  })

  const personTypeValue = form.watch('person_type')

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      fetchSuppliers()
    }
  }, [isMaster])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload: Partial<Supplier> = {
        name: values.name,
        email: values.email,
        tax_id: values.tax_id.replace(/\D/g, ''),
        person_type: values.person_type,
        phone: values.phone,
        legal_name: values.legal_name,
        address: values.address,
        external_code: values.external_code,
      }

      if (editingId) {
        await updateSupplier(editingId, payload)
        toast.success('Fornecedor atualizado com sucesso')
      } else {
        await createSupplier(payload)
        toast.success('Fornecedor pré-cadastrado com sucesso')
      }

      setOpen(false)
      form.reset()
      fetchSuppliers()
    } catch (error: any) {
      const errs = extractFieldErrors(error)
      if (Object.keys(errs).length > 0) {
        Object.entries(errs).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg })
        })
      } else {
        toast.error('Erro ao salvar fornecedor')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Deseja excluir este fornecedor? Usuários já vinculados não serão apagados, mas a relação será perdida.',
      )
    )
      return
    try {
      await deleteSupplier(id)
      toast.success('Excluído com sucesso')
      fetchSuppliers()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleOpenDialog = (s?: Supplier) => {
    if (s) {
      setEditingId(s.id)
      form.reset({
        name: s.name || '',
        email: s.email || '',
        tax_id: s.tax_id ? maskTaxId(s.tax_id, s.person_type) : '',
        person_type: s.person_type || 'PJ',
        phone: s.phone || '',
        legal_name: s.legal_name || '',
        address: s.address || '',
        external_code: s.external_code || '',
      })
    } else {
      setEditingId(null)
      form.reset({
        name: '',
        email: '',
        tax_id: '',
        person_type: 'PJ',
        phone: '',
        legal_name: '',
        address: '',
        external_code: '',
      })
    }
    setOpen(true)
  }

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.tax_id?.includes(search.replace(/\D/g, '')) ||
      s.legal_name?.toLowerCase().includes(search.toLowerCase()),
  )

  if (!isMaster) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">
            Pré-cadastre os fornecedores autorizados a utilizar o portal.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              form.reset()
              setEditingId(null)
            }
            setOpen(o)
          }}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </div>
          <SupplierImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onSuccess={fetchSuppliers}
          />
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Fornecedor' : 'Pré-cadastrar Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="person_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Pessoa</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val)
                            form.setValue('tax_id', '')
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                            <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ/CPF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              personTypeValue === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'
                            }
                            {...field}
                            onChange={(e) =>
                              field.onChange(maskTaxId(e.target.value, personTypeValue))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo ou Fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Razão Social{' '}
                          {personTypeValue === 'PF' && (
                            <span className="text-muted-foreground font-normal">(Opcional)</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Razão social" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Número, Bairro..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="external_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Externo</FormLabel>
                        <FormControl>
                          <Input placeholder="Código ERP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail Autorizado</FormLabel>
                        <FormControl>
                          <Input placeholder="email@exemplo.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            {...field}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit">Salvar Fornecedor</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Email Autorizado</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Carregando fornecedores...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.legal_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">{s.legal_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{maskTaxId(s.tax_id, s.person_type)}</TableCell>
                    <TableCell>{s.person_type}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
