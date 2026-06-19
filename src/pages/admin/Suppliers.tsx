import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronsUpDown,
  Check,
  X,
} from 'lucide-react'
import { cn, formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from '@/lib/utils'
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
import { getForestAreas, ForestArea, updateForestArea } from '@/services/forest_areas'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'

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
    forest_area: z.array(z.string()).optional(),
    controle_florestal: z.string().optional(),
    cep: z.string().optional(),
    municipio: z.string().optional(),
    uf: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.person_type === 'PF' && !isValidCPF(data.tax_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, insira um CPF válido com a formatação correta.',
        path: ['tax_id'],
      })
    }
    if (data.person_type === 'PJ' && !isValidCNPJ(data.tax_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Por favor, insira um CNPJ válido com a formatação correta.',
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
  const [forests, setForests] = useState<ForestArea[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ufFilter, setUfFilter] = useState('all')
  const [forestFilter, setForestFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null)
  const [forestHistory, setForestHistory] = useState<ForestArea[]>([])

  const uniqueUfs = Array.from(new Set(suppliers.map((s) => s.uf).filter(Boolean))).sort()

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
      cep: '',
      municipio: '',
      uf: '',
      forest_area: [],
    },
  })

  const personTypeValue = form.watch('person_type')
  const taxIdValue = form.watch('tax_id')

  const isTaxIdComplete =
    personTypeValue === 'PF' ? taxIdValue?.length === 14 : taxIdValue?.length === 18
  const isTaxIdValid =
    personTypeValue === 'PF' ? isValidCPF(taxIdValue || '') : isValidCNPJ(taxIdValue || '')

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      let filterStr = undefined
      if (forestFilter !== 'all') {
        if (forestFilter === 'none') {
          filterStr = `forest_area:length = 0 || forest_area = null || forest_area = ""`
        } else {
          filterStr = `forest_area ~ "${forestFilter}"`
        }
      }

      const [data, fData] = await Promise.all([
        getSuppliers(filterStr),
        forests.length === 0 ? getForestAreas() : Promise.resolve(forests),
      ])
      setSuppliers(data)
      if (forests.length === 0) setForests(fData)
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
  }, [isMaster, forestFilter])

  useRealtime(
    'suppliers',
    () => {
      if (isMaster) fetchSuppliers()
    },
    isMaster,
  )

  useRealtime(
    'forest_areas',
    () => {
      if (isMaster) {
        getForestAreas().then(setForests).catch(console.error)
        fetchSuppliers()
        if (editingId) {
          fetchForestHistory(editingId)
        }
      }
    },
    isMaster,
  )

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true)
      const payload: Partial<Supplier> = {
        name: values.name,
        email: values.email,
        tax_id: values.tax_id,
        person_type: values.person_type,
        phone: values.phone,
        legal_name: values.legal_name,
        address: values.address,
        external_code: values.external_code,
        forest_area:
          values.forest_area && values.forest_area.length > 0 ? values.forest_area : null,
        controle_florestal: values.controle_florestal,
        cep: values.cep,
        municipio: values.municipio,
        uf: values.uf,
      }

      if (editingId) {
        const currentSupplier = await pb.collection('suppliers').getOne<Supplier>(editingId)
        const currentForestIds = Array.isArray(currentSupplier.forest_area)
          ? currentSupplier.forest_area
          : currentSupplier.forest_area
            ? [currentSupplier.forest_area]
            : []
        const newForestIds = payload.forest_area || []

        await updateSupplier(editingId, payload)

        const removed = currentForestIds.filter((id) => !newForestIds.includes(id))
        const added = newForestIds.filter((id) => !currentForestIds.includes(id))

        if (removed.length > 0 || added.length > 0) {
          const activeForests = await pb.collection('forest_areas').getFullList({
            filter: `supplier="${editingId}" && is_active=true`,
          })
          const now = new Date().toISOString()

          for (const f of activeForests) {
            if (removed.includes(f.id)) {
              await updateForestArea(f.id, {
                is_active: false,
                end_date: now,
              })
            }
          }

          for (const fId of added) {
            await updateForestArea(fId, {
              supplier: editingId,
              start_date: now,
              is_active: true,
              end_date: '',
            })
          }
        }

        toast.success('Fornecedor atualizado com sucesso!')
      } else {
        const newSupplier = await createSupplier(payload)
        const newForestIds = payload.forest_area || []

        if (newForestIds.length > 0) {
          const now = new Date().toISOString()
          for (const fId of newForestIds) {
            await updateForestArea(fId, {
              supplier: newSupplier.id,
              start_date: now,
              is_active: true,
              end_date: '',
            })
          }
        }

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
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteSupplierId) return
    try {
      await deleteSupplier(deleteSupplierId)
      toast.success('Excluído com sucesso')
      fetchSuppliers()
    } catch (err) {
      toast.error('Erro ao excluir')
    } finally {
      setDeleteSupplierId(null)
    }
  }

  const fetchForestHistory = async (supplierId: string) => {
    try {
      const history = await pb.collection('forest_areas').getFullList<ForestArea>({
        filter: `supplier="${supplierId}"`,
        sort: '-start_date,-created',
      })
      setForestHistory(history)
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenDialog = (s?: Supplier) => {
    if (s) {
      setEditingId(s.id)
      fetchForestHistory(s.id)
      form.reset({
        name: s.name || '',
        email: s.email || '',
        tax_id: s.tax_id
          ? s.person_type === 'PF'
            ? formatCPF(s.tax_id)
            : formatCNPJ(s.tax_id)
          : '',
        person_type: s.person_type || 'PJ',
        phone: s.phone || '',
        legal_name: s.legal_name || '',
        address: s.address || '',
        external_code: s.external_code || '',
        forest_area: Array.isArray(s.forest_area)
          ? s.forest_area
          : s.forest_area
            ? [s.forest_area]
            : [],
        controle_florestal: s.controle_florestal || '',
        cep: s.cep || '',
        municipio: s.municipio || '',
        uf: s.uf || '',
      })
    } else {
      setEditingId(null)
      setForestHistory([])
      form.reset({
        name: '',
        email: '',
        tax_id: '',
        person_type: 'PJ',
        phone: '',
        legal_name: '',
        address: '',
        external_code: '',
        forest_area: [],
        controle_florestal: '',
        cep: '',
        municipio: '',
        uf: '',
      })
    }
    setOpen(true)
  }

  const searchClean = search.replace(/\D/g, '')

  const filtered = suppliers.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (searchClean !== '' && s.tax_id?.replace(/\D/g, '').includes(searchClean)) ||
      s.legal_name?.toLowerCase().includes(search.toLowerCase())

    const matchUf = ufFilter === 'all' || s.uf === ufFilter

    return matchSearch && matchUf
  })

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '')
                              field.onChange(raw.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="municipio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Município</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SP"
                            maxLength={2}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="forest_area"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-end">
                        <FormLabel>Florestas (Opcional)</FormLabel>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {field.value.map((id) => {
                              const f = forests.find((f) => f.id === id)
                              if (!f) return null
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="flex items-center gap-1 px-2 py-1"
                                >
                                  {f.name}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      field.onChange(field.value?.filter((v) => v !== id))
                                    }}
                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('w-full justify-between font-normal')}
                              >
                                Selecione as florestas
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar floresta..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma floresta encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {forests
                                    .filter((f) => !field.value?.includes(f.id))
                                    .map((f) => (
                                      <CommandItem
                                        key={f.id}
                                        value={f.name}
                                        onSelect={() => {
                                          field.onChange([...(field.value || []), f.id])
                                        }}
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {f.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="controle_florestal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Controle Florestal (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Código de controle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Fornecedor'}
                  </Button>
                </div>
              </form>
            </Form>

            {editingId && forestHistory.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Histórico de Vínculos</h3>
                <div className="space-y-3">
                  {forestHistory.map((fh) => (
                    <div key={fh.id} className="p-3 border rounded-md bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{fh.name}</span>
                        {fh.is_active ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Período:</span>{' '}
                          {fh.start_date
                            ? new Date(fh.start_date).toLocaleDateString('pt-BR', {
                                timeZone: 'UTC',
                              })
                            : 'N/A'}{' '}
                          -{' '}
                          {fh.end_date
                            ? new Date(fh.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                            : 'Atual'}
                        </p>
                        {fh.registration_number && (
                          <p>
                            <span className="font-medium">Registro:</span> {fh.registration_number}
                          </p>
                        )}
                        {fh.location && (
                          <p>
                            <span className="font-medium">Localização:</span> {fh.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 flex items-center gap-2 max-w-md w-full">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {(search !== '' || ufFilter !== 'all' || forestFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setUfFilter('all')
                setForestFilter('all')
              }}
              className="px-3"
            >
              Limpar
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Select value={ufFilter} onValueChange={setUfFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado (UF)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Estados</SelectItem>
              {uniqueUfs.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={forestFilter} onValueChange={setForestFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Área Florestal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Florestas</SelectItem>
              <SelectItem value="none">Nenhuma</SelectItem>
              {forests.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Email Autorizado</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Florestas</TableHead>
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
                    <TableCell>
                      {s.person_type === 'PF'
                        ? formatCPF(s.tax_id || '')
                        : formatCNPJ(s.tax_id || '')}
                    </TableCell>
                    <TableCell>
                      {s.expand?.forest_area &&
                      Array.isArray(s.expand.forest_area) &&
                      s.expand.forest_area.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.expand.forest_area.map((f) => (
                            <Badge key={f.id} variant="secondary" className="text-xs font-normal">
                              {f.name}
                            </Badge>
                          ))}
                        </div>
                      ) : s.expand?.forest_area && !Array.isArray(s.expand.forest_area) ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {(s.expand.forest_area as unknown as { name: string }).name}
                        </Badge>
                      ) : s.floresta_info ? (
                        <span className="text-sm">{s.floresta_info}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSupplierId(s.id)}
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

      <AlertDialog open={!!deleteSupplierId} onOpenChange={(o) => !o && setDeleteSupplierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
