import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import { getUsers, createUser, updateUser, deleteUser, User } from '@/services/users'
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
    password: z.string().optional(),
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
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const isMaster = user?.isAdmin === true || user?.role === 'Admin'

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
      address: '',
      password: '',
    },
  })

  const personTypeValue = form.watch('person_type')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers("role = 'Fornecedor'")
      setUsers(data)
    } catch (error) {
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      fetchUsers()
    }
  }, [isMaster])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload: any = {
        name: values.name,
        email: values.email,
        tax_id: values.tax_id,
        person_type: values.person_type,
        phone: values.phone,
        legal_name: values.legal_name,
        address: values.address,
        role: 'Fornecedor',
        isAdmin: false,
      }

      if (values.password) {
        payload.password = values.password
        payload.passwordConfirm = values.password
      }

      if (editingId) {
        await updateUser(editingId, payload)
        toast.success('Fornecedor atualizado com sucesso')
      } else {
        if (!values.password) {
          form.setError('password', { message: 'Senha é obrigatória para novo cadastro' })
          return
        }
        await createUser(payload)
        toast.success('Fornecedor criado com sucesso')
      }

      setOpen(false)
      form.reset()
      fetchUsers()
    } catch (error: any) {
      const errs = extractFieldErrors(error)
      let emailErrorHandled = false
      if (Object.keys(errs).length > 0) {
        Object.entries(errs).forEach(([field, msg]) => {
          if (field === 'email') {
            form.setError('email', { message: 'Este e-mail já está em uso' })
            emailErrorHandled = true
          } else {
            form.setError(field as any, { message: msg })
          }
        })
      }

      if (!emailErrorHandled) {
        if (
          error?.message?.toLowerCase().includes('email') ||
          error?.message?.toLowerCase().includes('already in use') ||
          error?.message?.toLowerCase().includes('validation')
        ) {
          form.setError('email', { message: 'Este e-mail já está em uso' })
        } else {
          toast.error('Erro ao salvar fornecedor')
        }
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este fornecedor?')) return
    try {
      await deleteUser(id)
      toast.success('Excluído com sucesso')
      fetchUsers()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleOpenDialog = (u?: User) => {
    if (u) {
      setEditingId(u.id)
      form.reset({
        name: u.name || '',
        email: u.email || '',
        tax_id: u.tax_id || '',
        person_type: u.person_type || 'PJ',
        phone: u.phone || '',
        legal_name: u.legal_name || '',
        address: u.address || '',
        password: '',
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
        password: '',
      })
    }
    setOpen(true)
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.tax_id?.includes(search) ||
      u.legal_name?.toLowerCase().includes(search.toLowerCase()),
  )

  if (!isMaster) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie os fornecedores cadastrados no sistema.</p>
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
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
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
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo ou fantasia" {...field} />
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
                          <Input placeholder="Razão social (obrigatório para PJ)" {...field} />
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
                        <FormLabel>E-mail</FormLabel>
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
                        <FormLabel>Telefone</FormLabel>
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Número, Bairro, Cidade - UF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingId ? 'Nova Senha (Opcional)' : 'Senha'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Senha de acesso" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                <TableHead>Email</TableHead>
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name}
                      {u.legal_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">{u.legal_name}</div>
                      )}
                    </TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
