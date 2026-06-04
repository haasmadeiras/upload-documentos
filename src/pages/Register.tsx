import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { formatCPF, isValidCPF, formatCNPJ, isValidCNPJ } from '@/lib/utils'
import { Mail, KeyRound, IdCard, CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
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

  const [step, setStep] = useState<'tax_id' | 'credentials' | 'otp' | 'success'>('tax_id')
  const [isLoading, setIsLoading] = useState(false)
  const [personType, setPersonType] = useState<PersonType>('PJ')
  const [mockCode, setMockCode] = useState('')
  const [otpCode, setOtpCode] = useState('')

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

  const handleCheckTaxId = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const rawTaxId = formData.taxId.replace(/\D/g, '')
    if (personType === 'PF' && !isValidCPF(formData.taxId)) {
      setFieldErrors({ taxId: 'CPF inválido.' })
      return
    }
    if (personType === 'PJ' && !isValidCNPJ(formData.taxId)) {
      setFieldErrors({ taxId: 'CNPJ inválido.' })
      return
    }

    setIsLoading(true)
    try {
      const res = await pb.send('/backend/v1/auth/supplier-check', {
        method: 'GET',
        query: { tax_id: rawTaxId },
      })

      if (!res.exists) {
        setFieldErrors({ taxId: res.message })
      } else if (res.hasUser) {
        setFieldErrors({ taxId: res.message })
      } else {
        setPersonType(res.person_type)
        setStep('credentials')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível verificar o documento.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}

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

    setIsLoading(true)
    try {
      const res = await pb.send('/backend/v1/auth/supplier-register-init', {
        method: 'POST',
        body: JSON.stringify({
          tax_id: formData.taxId,
          email: formData.email,
          password: formData.password,
        }),
      })

      setMockCode(res.mock_code)
      setStep('otp')
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: err.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) return

    setIsLoading(true)
    try {
      await pb.send('/backend/v1/auth/supplier-register-verify', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          code: otpCode,
          password: formData.password,
          tax_id: formData.taxId,
        }),
      })

      setStep('success')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro de Verificação', description: err.message })
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
            Cadastro de Fornecedor
          </h1>
          <p className="text-slate-600 text-center max-w-sm">
            Valide sua identidade para criar sua conta.
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg bg-white relative overflow-hidden">
          <CardHeader className="space-y-2 pb-6 pt-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                {step === 'tax_id' && 'Identificação'}
                {step === 'credentials' && 'Credenciais'}
                {step === 'otp' && 'Validação'}
                {step === 'success' && 'Cadastro Concluído'}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 'tax_id' && 'Insira seu documento para verificar seu pré-cadastro.'}
                {step === 'credentials' && 'Confirme seu e-mail e defina uma senha de acesso.'}
                {step === 'otp' && 'Verifique seu e-mail para continuar.'}
                {step === 'success' && 'Sua conta foi criada com sucesso.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {step === 'tax_id' && (
              <form
                onSubmit={handleCheckTaxId}
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

                <div className="space-y-2">
                  <Label htmlFor="taxId">{personType === 'PF' ? 'CPF' : 'CNPJ'}</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="taxId"
                      placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="pl-10 h-11"
                      value={formData.taxId}
                      onChange={handleTaxIdChange}
                      maxLength={personType === 'PF' ? 14 : 18}
                      required
                    />
                  </div>
                  {fieldErrors.taxId && (
                    <p className="text-sm font-medium text-destructive">{fieldErrors.taxId}</p>
                  )}
                </div>

                <div className="pt-4 space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium shadow-sm"
                    disabled={isLoading || !formData.taxId}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" /> Continuar
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

            {step === 'credentials' && (
              <form
                onSubmit={handleInitRegister}
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                <div className="space-y-4">
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
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>

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
                      onClick={() => setStep('tax_id')}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Alterar Documento
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="bg-slate-100 p-4 rounded-lg inline-block">
                    <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold">Verifique seu e-mail</h3>
                  <p className="text-sm text-slate-600">
                    Enviamos um código de 6 dígitos para <strong>{formData.email}</strong>.
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
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Verificar Código'
                      )}
                    </Button>
                    <div className="flex justify-center text-center mt-2">
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-slate-600 hover:text-slate-900"
                        onClick={() => setStep('credentials')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
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
                <div className="text-center space-y-3 max-w-sm">
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
