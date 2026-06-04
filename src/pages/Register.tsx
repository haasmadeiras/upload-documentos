import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { formatCPF, isValidCPF, formatCNPJ, isValidCNPJ } from '@/lib/utils'
import {
  Mail,
  KeyRound,
  Building2,
  User as UserIcon,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  IdCard,
  Info,
} from 'lucide-react'
import logoUrl from '@/assets/image-bb79d.png'

type PersonType = 'PF' | 'PJ'

export default function Register() {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.isAdmin === true || user.role === 'Admin'
      navigate(isAdmin ? '/admin' : '/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [personType, setPersonType] = useState<PersonType>('PF')
  const [isClaiming, setIsClaiming] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [mockCode, setMockCode] = useState('')

  const [formData, setFormData] = useState({
    taxId: '',
    email: '',
    name: '',
    legalName: '',
    phone: '',
    address: '',
    password: '',
    passwordConfirm: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('reg_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.personType) setPersonType(parsed.personType)
        if (parsed.data) setFormData((prev) => ({ ...prev, ...parsed.data }))
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (step === 'form') {
      const draft = {
        personType,
        data: {
          taxId: formData.taxId,
          email: formData.email,
          name: formData.name,
          legalName: formData.legalName,
          phone: formData.phone,
          address: formData.address,
        },
      }
      localStorage.setItem('reg_draft', JSON.stringify(draft))
    }
  }, [personType, formData, step])

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFormData((prev) => ({
      ...prev,
      taxId: personType === 'PF' ? formatCPF(val) : formatCNPJ(val),
    }))
    if (fieldErrors.taxId) setFieldErrors((prev) => ({ ...prev, taxId: '' }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 11) val = val.slice(0, 11)
    let formatted = val
    if (val.length > 2) formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`
    if (val.length > 6) formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`
    setFormData((prev) => ({ ...prev, phone: formatted }))
  }

  const checkTaxId = async (value: string) => {
    if (!value) return

    const raw = value.replace(/\D/g, '')
    if (personType === 'PF' && raw.length !== 11) return
    if (personType === 'PJ' && raw.length !== 14) return

    try {
      const res = await pb.send('/backend/v1/auth/check-tax-id', {
        method: 'GET',
        query: { tax_id: value },
      })

      if (res.exists) {
        if (res.hasPassword) {
          setFieldErrors((prev) => ({
            ...prev,
            taxId: 'Documento já cadastrado. Por favor, realize o login ou recupere sua senha.',
          }))
          setIsClaiming(false)
          toast({
            title: 'Cadastro Existente',
            description: 'Este documento já está cadastrado e possui senha.',
            variant: 'destructive',
          })
        } else {
          setIsClaiming(true)
          setFieldErrors((prev) => ({ ...prev, taxId: '' }))
          toast({
            title: 'Cadastro Prévio Encontrado',
            description:
              'Identificamos seu cadastro prévio. Vamos definir seu e-mail e senha para acesso.',
          })
          setFormData((prev) => ({
            ...prev,
            email: res.email || prev.email,
            name: res.name || prev.name,
            legalName: res.legal_name || prev.legalName,
            phone: res.phone || prev.phone,
            address: res.address || prev.address,
          }))
          if (res.person_type && (res.person_type === 'PF' || res.person_type === 'PJ')) {
            setPersonType(res.person_type as PersonType)
          }
        }
      } else {
        setIsClaiming(false)
        setFieldErrors((prev) => ({ ...prev, taxId: '' }))
      }
    } catch (e) {
      console.error('Error checking tax id', e)
    }
  }

  const logAttempt = async (status: 'success' | 'failure', errorMsg: string = '') => {
    try {
      await pb.collection('registration_logs').create({
        tax_id: formData.taxId,
        email: formData.email,
        status,
        error_message: errorMsg,
      })
    } catch (e) {
      console.error('Failed to log registration attempt', e)
    }
  }

  const handleInitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}

    if (personType === 'PF') {
      if (!isValidCPF(formData.taxId)) errors.taxId = 'CPF inválido.'
      if (!formData.name.trim()) errors.name = 'Nome é obrigatório.'
    } else {
      if (!isValidCNPJ(formData.taxId)) errors.taxId = 'CNPJ inválido.'
      if (!formData.legalName.trim()) errors.legalName = 'Razão Social é obrigatória.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail inválido.'
    }
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

    if (fieldErrors.taxId || fieldErrors.email) {
      return
    }

    if (!navigator.onLine) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Verifique sua internet.',
      })
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        email: formData.email,
        tax_id: formData.taxId,
        password: formData.password,
      }

      const res = await pb.send('/backend/v1/auth/supplier-register-init', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setMockCode(res.mock_code)
      setStep('otp')
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro no Cadastro',
          description: err.message || 'Ocorreu um erro ao iniciar o cadastro.',
        })
      }
      await logAttempt('failure', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) return

    setIsLoading(true)
    try {
      const payload = {
        email: formData.email,
        code: otpCode,
        password: formData.password,
        tax_id: formData.taxId,
        person_type: personType,
        name: personType === 'PF' ? formData.name : '',
        legal_name: personType === 'PJ' ? formData.legalName : '',
        phone: formData.phone,
        address: formData.address,
      }

      await pb.send('/backend/v1/auth/supplier-register-verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      await logAttempt('success')
      localStorage.removeItem('reg_draft')
      setStep('success')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro de Verificação', description: err.message })
      await logAttempt('failure', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid =
    formData.email &&
    formData.taxId &&
    formData.password.length >= 8 &&
    formData.password === formData.passwordConfirm &&
    !fieldErrors.taxId &&
    !fieldErrors.email &&
    (personType === 'PF' ? formData.name.trim() : formData.legalName.trim())

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <img
            src={logoUrl}
            alt="Haas Madeiras"
            className="h-20 object-contain mix-blend-multiply bg-transparent"
          />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center">
            Cadastro de Fornecedor
          </h1>
          <p className="text-slate-600 text-center max-w-sm">
            Crie sua conta para gerenciar seus documentos e requisitos com facilidade.
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg bg-white relative overflow-hidden">
          <CardHeader className="space-y-2 pb-6 pt-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                {step === 'form' && 'Seus Dados'}
                {step === 'otp' && 'Validação'}
                {step === 'success' && 'Cadastro Concluído'}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 'form' &&
                  'Insira as informações da sua empresa ou dados pessoais para validar o acesso.'}
                {step === 'otp' && 'Verifique seu e-mail para continuar.'}
                {step === 'success' &&
                  'Sua conta foi criada com sucesso. Você já pode acessar o portal.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {step === 'form' && (
              <form
                onSubmit={handleInitRegister}
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                {isClaiming && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Cadastro Prévio Encontrado</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Identificamos seu cadastro prévio. Vamos definir seu e-mail e senha para
                      acesso.
                    </AlertDescription>
                  </Alert>
                )}

                <Tabs
                  value={personType}
                  onValueChange={(v) => {
                    setPersonType(v as PersonType)
                    setFormData((prev) => ({ ...prev, taxId: '', name: '', legalName: '' }))
                    setFieldErrors({})
                    setIsClaiming(false)
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                    <TabsTrigger value="PF" className="text-sm font-medium">
                      Pessoa Física (PF)
                    </TabsTrigger>
                    <TabsTrigger value="PJ" className="text-sm font-medium">
                      Pessoa Jurídica (PJ)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="taxId">{personType === 'PF' ? 'CPF' : 'CNPJ'}</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="taxId"
                          placeholder={
                            personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'
                          }
                          className="pl-10 h-11"
                          value={formData.taxId}
                          onChange={handleTaxIdChange}
                          onBlur={() => checkTaxId(formData.taxId)}
                          maxLength={personType === 'PF' ? 14 : 18}
                          required
                        />
                      </div>
                      {fieldErrors.taxId && (
                        <p className="text-sm font-medium text-destructive">{fieldErrors.taxId}</p>
                      )}
                    </div>

                    {personType === 'PF' ? (
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input
                            id="name"
                            placeholder="Seu nome completo"
                            className="pl-10 h-11"
                            value={formData.name}
                            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                            required
                          />
                        </div>
                        {fieldErrors.name && (
                          <p className="text-sm font-medium text-destructive">{fieldErrors.name}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="legalName">Razão Social</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input
                            id="legalName"
                            placeholder="Nome da empresa"
                            className="pl-10 h-11"
                            value={formData.legalName}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, legalName: e.target.value }))
                            }
                            required
                          />
                        </div>
                        {fieldErrors.legalName && (
                          <p className="text-sm font-medium text-destructive">
                            {fieldErrors.legalName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="nome@exemplo.com"
                          className="pl-10 h-11"
                          value={formData.email}
                          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                          onBlur={(e) => {
                            if (
                              e.target.value &&
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)
                            ) {
                              setFieldErrors((prev) => ({ ...prev, email: 'E-mail inválido.' }))
                            } else {
                              if (fieldErrors.email === 'E-mail inválido.') {
                                setFieldErrors((prev) => ({ ...prev, email: '' }))
                              }
                            }
                          }}
                          required
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm font-medium text-destructive">{fieldErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="phone"
                          placeholder="(00) 00000-0000"
                          className="pl-10 h-11"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          maxLength={15}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="address"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        className="pl-10 h-11"
                        value={formData.address}
                        onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
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
                            if (fieldErrors.password)
                              setFieldErrors((p) => ({ ...p, password: '' }))
                          }}
                          required
                        />
                      </div>
                      {fieldErrors.password && (
                        <p className="text-sm font-medium text-destructive">
                          {fieldErrors.password}
                        </p>
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
                </div>

                <div className="pt-6 space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium shadow-sm"
                    disabled={isLoading || !isFormValid}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                      </span>
                    ) : (
                      'Criar Conta'
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

            {step === 'otp' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="bg-slate-100 p-4 rounded-lg inline-block">
                    <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold">Verifique seu e-mail</h3>
                  <p className="text-sm text-slate-600">
                    Enviamos um código de 6 dígitos para <strong>{formData.email}</strong>. Insira-o
                    abaixo para confirmar seu cadastro.
                  </p>
                  {mockCode && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-4">
                      Ambiente de teste. Código gerado: <strong>{mockCode}</strong>
                    </p>
                  )}
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-6 pt-2">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={(val: string) => setOtpCode(val)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="pt-4 space-y-4">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium shadow-sm"
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
                        </span>
                      ) : (
                        'Verificar Código'
                      )}
                    </Button>
                    <div className="flex justify-center text-center mt-2">
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-slate-600 hover:text-slate-900"
                        onClick={() => setStep('form')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos dados
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <div className="text-center space-y-3 max-w-md">
                  <p className="text-lg text-slate-700 font-medium">
                    Cadastro realizado com sucesso!
                  </p>
                  <p className="text-slate-500 text-sm">
                    Sua conta foi criada. Você já pode fazer login para acessar o portal e enviar
                    seus documentos.
                  </p>
                </div>
                <Button asChild className="h-12 px-8 font-medium">
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
