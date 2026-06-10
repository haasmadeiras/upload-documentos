import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { formatCPF, isValidCPF, formatCNPJ, isValidCNPJ, cn } from '@/lib/utils'
import {
  Mail,
  KeyRound,
  IdCard,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import logoUrl from '@/assets/image-bb79d.png'

type PersonType = 'PF' | 'PJ'

export default function Register() {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdminOrColab =
        user.isAdmin === true || user.role === 'Admin' || user.role === 'Colaborador'
      navigate(isAdminOrColab ? '/admin' : '/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const [step, setStep] = useState<'verification' | 'password' | 'success'>('verification')
  const [isLoading, setIsLoading] = useState(false)
  const [personType, setPersonType] = useState<PersonType>('PJ')
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')

  const isTaxIdComplete =
    personType === 'PF' ? formData.taxId.length === 14 : formData.taxId.length === 18
  const isTaxIdValid =
    personType === 'PF' ? isValidCPF(formData.taxId) : isValidCNPJ(formData.taxId)

  const [formData, setFormData] = useState({
    taxId: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFormData((prev) => ({
      ...prev,
      taxId: personType === 'PF' ? formatCPF(val) : formatCNPJ(val),
    }))
    if (fieldErrors.taxId) setFieldErrors((prev) => ({ ...prev, taxId: '' }))
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}

    if (personType === 'PF' && !isValidCPF(formData.taxId)) {
      errors.taxId = 'Por favor, insira um CPF ou CNPJ válido com a formatação correta.'
    }
    if (personType === 'PJ' && !isValidCNPJ(formData.taxId)) {
      errors.taxId = 'Por favor, insira um CPF ou CNPJ válido com a formatação correta.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail inválido.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      const res = await pb.send('/backend/v1/auth/supplier-verify', {
        method: 'POST',
        body: JSON.stringify({
          tax_id: formData.taxId,
          email: formData.email,
        }),
      })

      setSupplierId(res.supplier_id)
      setSupplierName(res.name)
      setStep('password')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Verificação',
        description: err.message || 'Não foi possível verificar os dados.',
      })
      if (err.message?.includes('Usuário já cadastrado')) {
        setFieldErrors({ taxId: err.message })
      } else if (err.message?.includes('O CPF/CNPJ informado não foi encontrado')) {
        setFieldErrors({ taxId: err.message })
      } else if (err.message?.includes('O e-mail informado não coincide')) {
        setFieldErrors({ email: err.message })
      } else if (err.message?.includes('Fornecedor não localizado')) {
        setFieldErrors({ taxId: err.message, email: err.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (formData.password.length < 8) {
      errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'As senhas não coincidem.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      await pb.collection('users').create({
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        tax_id: formData.taxId,
        role: 'Fornecedor',
        isAdmin: false,
        active: true,
        supplier: supplierId,
        person_type: personType,
        name: supplierName || formData.email.split('@')[0],
      })
      setStep('success')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao criar conta',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-20 object-contain mix-blend-multiply bg-transparent"
          />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center">
            Nova Conta
          </h1>
          <p className="text-slate-600 text-center max-w-sm">
            Valide sua identidade para criar sua conta.
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg bg-white relative overflow-hidden">
          <CardHeader className="space-y-2 pb-6 pt-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                {step === 'verification' && 'Passo 1: Verificação'}
                {step === 'password' && 'Passo 2: Criar Senha'}
                {step === 'success' && 'Cadastro Concluído'}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 'verification' && 'Insira seus dados para verificar o pré-cadastro.'}
                {step === 'password' && 'Defina uma senha segura para o seu acesso.'}
                {step === 'success' && 'Conta ativada com sucesso!'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {step === 'verification' && (
              <form
                onSubmit={handleVerification}
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <Tabs
                  value={personType}
                  onValueChange={(v) => {
                    setPersonType(v as PersonType)
                    setFormData((prev) => ({ ...prev, taxId: '' }))
                    setFieldErrors({})
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                    <TabsTrigger value="PJ" className="text-sm font-medium">
                      Pessoa Jurídica (PJ)
                    </TabsTrigger>
                    <TabsTrigger value="PF" className="text-sm font-medium">
                      Pessoa Física (PF)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{personType === 'PF' ? 'CPF' : 'CNPJ'}</Label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="taxId"
                        placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                        className={cn(
                          'pl-10 h-11 pr-10',
                          formData.taxId &&
                            isTaxIdComplete &&
                            !isTaxIdValid &&
                            'border-destructive focus-visible:ring-destructive',
                          formData.taxId &&
                            isTaxIdValid &&
                            'border-emerald-500 focus-visible:ring-emerald-500',
                        )}
                        value={formData.taxId}
                        onChange={handleTaxIdChange}
                        maxLength={personType === 'PF' ? 14 : 18}
                        required
                      />
                      {formData.taxId && isTaxIdValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      )}
                      {formData.taxId && isTaxIdComplete && !isTaxIdValid && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
                      )}
                    </div>
                    {formData.taxId && isTaxIdComplete && !isTaxIdValid && !fieldErrors.taxId && (
                      <p className="text-sm font-medium text-destructive">Documento Inválido</p>
                    )}
                    {fieldErrors.taxId && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.taxId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Cadastrado</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        className="pl-10 h-11"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, email: e.target.value }))
                          if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }))
                        }}
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium shadow-sm"
                    disabled={isLoading || !formData.taxId || !formData.email}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verificar Cadastro <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <div className="flex justify-center text-center mt-2">
                    <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900">
                      <Link to="/" className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Login
                      </Link>
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form
                onSubmit={handleCreateAccount}
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo de 8 caracteres"
                        className="pl-10 h-11"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, password: e.target.value }))
                          if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }))
                        }}
                        required
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">Confirmar Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="passwordConfirm"
                        type="password"
                        placeholder="Repita a senha"
                        className="pl-10 h-11"
                        value={formData.passwordConfirm}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, passwordConfirm: e.target.value }))
                          if (fieldErrors.passwordConfirm)
                            setFieldErrors((p) => ({ ...p, passwordConfirm: '' }))
                        }}
                        required
                      />
                    </div>
                    {fieldErrors.passwordConfirm && (
                      <p className="text-sm font-medium text-destructive">
                        {fieldErrors.passwordConfirm}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Conta'}
                  </Button>

                  <div className="flex justify-center text-center mt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setStep('verification')}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="text-center space-y-3 max-w-sm">
                  <p className="text-lg text-slate-700 font-medium">
                    Conta ativada com sucesso! Agora você pode realizar o login.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Você já pode acessar o portal para enviar seus documentos.
                  </p>
                </div>
                <Button asChild className="w-full h-12 font-medium">
                  <Link to="/">Ir para Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
