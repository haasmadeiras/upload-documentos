import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'

import { getUsers, createUser, updateUser, deleteUser, User } from '@/services/users'
import { getSuppliers } from '@/services/suppliers'
import { formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Trash2,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SortField = 'name' | 'email' | 'role' | 'active' | 'tax_id' | 'last_login'
type SortOrder = 'asc' | 'desc'
type ExtendedUser = User & { last_login?: string }
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido').or(z.literal('')),
    tax_id: z.string().min(14, 'Documento inválido'),
    role: z.enum(['Admin', 'Colaborador', 'Fornecedor']),
    person_type: z.enum(['PF', 'PJ']),
    phone: z.string().optional(),
    legal_name: z.string().optional(),
    address: z.string().optional(),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.person_type === 'PF' && !isValidCPF(data.tax_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, insira um CPF ou CNPJ válido com a formatação correta.',
        path: ['tax_id'],
      })
    }
    if (data.person_type === 'PJ' && !isValidCNPJ(data.tax_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, insira um CPF ou CNPJ válido com a formatação correta.',
        path: ['tax_id'],
      })
    }

    if (
      data.active &&
      data.role === 'Fornecedor' &&
      data.person_type === 'PJ' &&
      (!data.legal_name || data.legal_name.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Razão Social é obrigatória para Fornecedor PJ',
        path: ['legal_name'],
      })
    }
  })

function maskPhone(value: string) {
  const raw = value.replace(/\D/g, '')
  if (raw.length <= 10) {
    return raw.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else {
    return raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
  }
}

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('last_login')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const isMaster = user?.isAdmin === true || user?.role === 'Admin'
  const isColaborador = user?.role === 'Colaborador'
  const canManageUsers = isMaster || isColaborador

  useEffect(() => {
    if (isAuthenticated && !canManageUsers) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, canManageUsers, navigate])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      tax_id: '',
      role: 'Colaborador',
      person_type: 'PJ',
      phone: '',
      legal_name: '',
      address: '',
      active: true,
    },
  })

  const roleValue = form.watch('role')
  const personTypeValue = form.watch('person_type')
  const taxIdValue = form.watch('tax_id')

  const isTaxIdComplete =
    personTypeValue === 'PF' ? taxIdValue?.length === 14 : taxIdValue?.length === 18
  const isTaxIdValid =
    personTypeValue === 'PF' ? isValidCPF(taxIdValue || '') : isValidCNPJ(taxIdValue || '')

  const isFornecedor = roleValue === 'Fornecedor'

  useEffect(() => {
    async function fetchSupplier() {
      if (isFornecedor && isTaxIdComplete && isTaxIdValid) {
        const cleanTaxId = taxIdValue?.replace(/\D/g, '') || ''
        try {
          const suppliers = await getSuppliers(
            `tax_id = '${cleanTaxId}' || tax_id = '${taxIdValue}'`,
          )
          if (suppliers.length > 0) {
            const supplierData = suppliers[0]
            form.setValue('legal_name', supplierData.legal_name || '')
            form.setValue('phone', maskPhone(supplierData.phone || ''))
            form.setValue('address', supplierData.address || '')
          } else {
            form.setValue('legal_name', '')
            form.setValue('phone', '')
            form.setValue('address', '')
          }
        } catch (e) {
          console.error('Failed to fetch supplier by tax_id', e)
        }
      }
    }
    if (open) {
      fetchSupplier()
    }
  }, [taxIdValue, isTaxIdComplete, isTaxIdValid, isFornecedor, form, open])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers()
    }
  }, [canManageUsers])

  useRealtime(
    'users',
    (e) => {
      if (e.action === 'create') {
        setUsers((prev) => [e.record as unknown as User, ...prev])
      } else if (e.action === 'update') {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === e.record.id ? { ...u, ...(e.record as unknown as User), expand: u.expand } : u,
          ),
        )
      } else if (e.action === 'delete') {
        setUsers((prev) => prev.filter((u) => u.id !== e.record.id))
      }
    },
    canManageUsers,
  )

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingId && !values.email) {
      form.setError('email', { message: 'E-mail é obrigatório para novos usuários' })
      return
    }

    try {
      if (editingId) {
        const payload: any = { ...values, isAdmin: values.role === 'Admin' }
        if (!payload.email) delete payload.email
        await updateUser(editingId, payload)
        toast.success('Usuário atualizado com sucesso.')
      } else {
        // Generate a secure random password for the pending user.
        // They will set their own password via the verification flow.
        const randomPassword = Math.random().toString(36).slice(-10) + 'A1!a'
        await createUser({
          ...values,
          isAdmin: values.role === 'Admin',
          password: randomPassword,
          passwordConfirm: randomPassword,
        })
        toast.success('Usuário convidado com sucesso. Ele já pode se registrar.')
      }
      setOpen(false)
      setEditingId(null)
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
          toast.error(editingId ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário')
        }
      }
    }
  }

  const searchClean = search.replace(/\D/g, '')

  const filteredUsers = (users as ExtendedUser[]).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (searchClean !== '' && u.tax_id?.replace(/\D/g, '').includes(searchClean)) ||
      u.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.expand?.supplier?.legal_name?.toLowerCase().includes(search.toLowerCase()),
  )

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let valA: any = a[sortField]
    let valB: any = b[sortField]

    if (sortField === 'last_login') {
      valA = valA ? new Date(valA).getTime() : 0
      valB = valB ? new Date(valB).getTime() : 0
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = (valB || '').toLowerCase()
    } else if (typeof valA === 'boolean') {
      valA = valA ? 1 : 0
      valB = valB ? 1 : 0
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'last_login' ? 'desc' : 'asc')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return
    try {
      await deleteUser(deleteUserId)
      toast.success('Usuário excluído com sucesso.')
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao excluir usuário.')
    } finally {
      setDeleteUserId(null)
    }
  }

  const handleEditClick = async (u: User) => {
    setEditingId(u.id)

    let supplierData: any = u.expand?.supplier

    if (!supplierData && u.role === 'Fornecedor' && u.tax_id) {
      try {
        const cleanTaxId = u.tax_id.replace(/\D/g, '')
        const suppliers = await getSuppliers(`tax_id = '${cleanTaxId}' || tax_id = '${u.tax_id}'`)
        if (suppliers.length > 0) {
          supplierData = suppliers[0]
        }
      } catch (e) {
        console.error('Failed to fetch supplier by tax_id', e)
      }
    }

    form.reset({
      name: u.name || '',
      email: u.email || '',
      tax_id: u.person_type === 'PF' ? formatCPF(u.tax_id || '') : formatCNPJ(u.tax_id || ''),
      role: u.role,
      person_type: u.person_type,
      phone: maskPhone(u.phone || supplierData?.phone || ''),
      legal_name: u.legal_name || supplierData?.legal_name || '',
      address: u.address || supplierData?.address || '',
      active: u.active ?? true,
    })
    setOpen(true)
  }

  if (!canManageUsers) return null

  const canEditOrDelete = (u: User) => {
    if (isMaster) return u.role === 'Colaborador' || u.role === 'Fornecedor'
    if (isColaborador) return u.role === 'Fornecedor'
    return false
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie o acesso de administradores, colaboradores e fornecedores.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              form.reset({
                name: '',
                email: '',
                tax_id: '',
                role: 'Colaborador',
                person_type: 'PJ',
                phone: '',
                legal_name: '',
                address: '',
                active: true,
              })
              setEditingId(null)
            }
            setOpen(o)
          }}
        >
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role (Nível de Acesso)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o acesso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Colaborador">Colaborador</SelectItem>
                          <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <div className="relative">
                            <Input
                              placeholder={
                                personTypeValue === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'
                              }
                              className={cn(
                                'pr-10',
                                taxIdValue &&
                                  isTaxIdComplete &&
                                  !isTaxIdValid &&
                                  'border-destructive focus-visible:ring-destructive',
                                taxIdValue &&
                                  isTaxIdValid &&
                                  'border-emerald-500 focus-visible:ring-emerald-500',
                              )}
                              {...field}
                              maxLength={personTypeValue === 'PF' ? 14 : 18}
                              onChange={(e) =>
                                field.onChange(
                                  personTypeValue === 'PF'
                                    ? formatCPF(e.target.value)
                                    : formatCNPJ(e.target.value),
                                )
                              }
                            />
                            {taxIdValue && isTaxIdValid && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                            )}
                            {taxIdValue && isTaxIdComplete && !isTaxIdValid && (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                            )}
                          </div>
                        </FormControl>
                        {taxIdValue && isTaxIdComplete && !isTaxIdValid && (
                          <p className="text-sm font-medium text-destructive mt-1">
                            Documento Inválido
                          </p>
                        )}
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
                          <Input placeholder="Nome completo" {...field} />
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
                          {roleValue !== 'Fornecedor' || personTypeValue === 'PF' ? (
                            <span className="text-muted-foreground font-normal">(Opcional)</span>
                          ) : null}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Razão social (se aplicável)"
                            {...field}
                            readOnly={isFornecedor}
                            className={cn(
                              isFornecedor && 'bg-muted text-muted-foreground cursor-not-allowed',
                            )}
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@exemplo.com"
                            type="email"
                            {...field}
                            value={field.value || ''}
                            readOnly={!isMaster && !!editingId}
                            className={cn(
                              !isMaster && !!editingId && 'bg-muted text-muted-foreground',
                            )}
                          />
                        </FormControl>
                        {field.value === '' && !!editingId && (
                          <p className="text-sm text-amber-600 mt-1">
                            E-mail oculto ou não cadastrado. A atualização manterá o e-mail atual.
                          </p>
                        )}
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
                            readOnly={isFornecedor}
                            className={cn(
                              isFornecedor && 'bg-muted text-muted-foreground cursor-not-allowed',
                            )}
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
                        <Input
                          placeholder="Rua, Número, Bairro, Cidade - Estado, CEP"
                          {...field}
                          readOnly={isFornecedor}
                          className={cn(
                            isFornecedor && 'bg-muted text-muted-foreground cursor-not-allowed',
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                          Conta Ativa
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Desative esta opção para bloquear o acesso do usuário ao sistema.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex justify-end">
                  <Button type="submit">
                    {editingId ? 'Atualizar Usuário' : 'Salvar Usuário'}
                  </Button>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Nome
                  {sortField === 'name' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-1">
                  E-mail
                  {sortField === 'email' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-1">
                  Role
                  {sortField === 'role' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('active')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'active' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('tax_id')}
              >
                <div className="flex items-center gap-1">
                  CNPJ/CPF
                  {sortField === 'tax_id' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('last_login')}
              >
                <div className="flex items-center gap-1">
                  Último Acesso
                  {sortField === 'last_login' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {(u.legal_name || u.expand?.supplier?.legal_name) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {u.legal_name || u.expand?.supplier?.legal_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'Admin' || u.isAdmin
                          ? 'default'
                          : u.role === 'Fornecedor'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {u.role || (u.isAdmin ? 'Admin' : 'N/A')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.active !== false ? 'default' : 'secondary'}
                      className={u.active !== false ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    >
                      {u.active !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.person_type === 'PF'
                      ? formatCPF(u.tax_id || '')
                      : formatCNPJ(u.tax_id || '')}
                  </TableCell>
                  <TableCell>
                    {u.last_login ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(u.last_login), 'dd/MM/yyyy HH:mm')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Nunca acessou</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canEditOrDelete(u) && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(u)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteUserId(u.id)}
                          className="text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
