import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import { getUsers, createUser, User } from '@/services/users'
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
    email: z.string().email('E-mail inválido'),
    tax_id: z.string().min(14, 'CNPJ/CPF inválido'),
    role: z.enum(['Admin', 'Colaborador', 'Fornecedor']),
    phone: z.string().optional(),
    legal_name: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'Colaborador' && (!data.legal_name || data.legal_name.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Razão Social é obrigatória para este perfil',
        path: ['legal_name'],
      })
    }
  })

function maskTaxId(value: string) {
  const raw = value.replace(/\D/g, '')
  if (raw.length <= 11) {
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
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

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const isMaster = user?.isAdmin || user?.role === 'Admin'

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
      role: 'Colaborador',
      phone: '',
      legal_name: '',
    },
  })

  const roleValue = form.watch('role')

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
    if (isMaster) {
      fetchUsers()
    }
  }, [isMaster])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const isCnpj = values.tax_id.replace(/\D/g, '').length > 11
      const person_type = isCnpj ? 'PJ' : 'PF'

      await createUser({
        ...values,
        isAdmin: values.role === 'Admin',
        person_type,
        password: 'Senha123!@#',
        passwordConfirm: 'Senha123!@#',
      })
      toast.success('Usuário criado com sucesso')
      setOpen(false)
      form.reset()
      fetchUsers()
    } catch (error) {
      const errs = extractFieldErrors(error)
      if (Object.keys(errs).length > 0) {
        Object.entries(errs).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg })
        })
      } else {
        toast.error('Erro ao criar usuário')
      }
    }
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie o acesso de colaboradores e fornecedores.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) form.reset()
            setOpen(o)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
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
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ/CPF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            {...field}
                            onChange={(e) => field.onChange(maskTaxId(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Razão Social{' '}
                        {roleValue === 'Colaborador' && (
                          <span className="text-muted-foreground font-normal">(Opcional)</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social (se aplicável)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="pt-4 flex justify-end">
                  <Button type="submit">Salvar Usuário</Button>
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
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  Nenhum usuário encontrado.
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
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'Admin'
                          ? 'default'
                          : u.role === 'Fornecedor'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {u.role || (u.isAdmin ? 'Admin' : 'N/A')}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.tax_id}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
