import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  MailCheck,
  KeyRound,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import logoUrl from '@/assets/image-bb79d.png'

export default function Register() {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.isAdmin === true || user.role === 'Admin'
      navigate(isAdmin ? '/admin' : '/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [isLoading, setIsLoading] = useState(false)

  const [taxId, setTaxId] = useState(() => localStorage.getItem('reg_taxId') || '')
  const [email, setEmail] = useState(
    () => localStorage.getItem('reg_email') || location.state?.email || '',
  )
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [otp, setOtp] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [mockCode, setMockCode] = useState('')

  useEffect(() => {
    localStorage.setItem('reg_taxId', taxId)
  }, [taxId])

  useEffect(() => {
    localStorage.setItem('reg_email', email)
  }, [email])

  const logAttempt = async (status: 'success' | 'failure', errorMsg: string = '') => {
    try {
      await pb.collection('registration_logs').create({
        tax_id: taxId,
        email,
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

    if (!taxId || taxId.replace(/\D/g, '').length !== 14) {
      errors.taxId = 'CNPJ inválido.'
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Por favor, insira um e-mail válido.'
    }

    if (password !== passwordConfirm) {
      errors.passwordConfirm = 'As senhas não coincidem.'
    }

    if (password.length < 8) {
      errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (!navigator.onLine) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Erro de conexão. Verifique sua internet.',
      })
      return
    }

    setIsLoading(true)

    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `tax_id = "${taxId}" || tax_id = "${taxId.replace(/\D/g, '')}"`,
      })

      if (existingUsers.items.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Cadastro Existente',
          description: 'Este CNPJ/CPF já possui cadastro.',
        })
        setIsLoading(false)
        return
      }
    } catch (e) {
      console.error('Error checking existing users', e)
    }

    try {
      const res = await pb.send('/backend/v1/auth/supplier-register-init', {
        method: 'POST',
        body: JSON.stringify({ email, tax_id: taxId, password }),
      })

      await logAttempt('success')
      setMockCode(res.mock_code)
      setStep('otp')
      toast({
        title: 'Código enviado com sucesso!',
        description: `Verifique sua caixa de entrada.`,
      })
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({
          variant: 'destructive',
          title: 'Cadastro não localizado',
          description:
            'Dados não encontrados na base de fornecedores. Por favor, entre em contato com o suporte.',
        })
      }
      await logAttempt('failure', err.message || 'Dados não encontrados na base.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!navigator.onLine) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Erro de conexão. Verifique sua internet.',
      })
      return
    }

    setIsLoading(true)

    try {
      await pb.send('/backend/v1/auth/supplier-register-verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: otp, password }),
      })

      localStorage.removeItem('reg_taxId')
      localStorage.removeItem('reg_email')

      setStep('success')
      toast({
        title: 'Sucesso',
        description: 'Conta ativada com sucesso! Redirecionando para o login...',
      })
      setTimeout(() => navigate('/'), 3000)
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de Verificação',
          description: err.message || 'Código inválido ou expirado.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '')
    let formatted = digits
    if (digits.length > 2) formatted = digits.replace(/^(\d{2})(\d)/, '$1.$2')
    if (digits.length > 5) formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    if (digits.length > 8) formatted = formatted.replace(/\.(\d{3})(\d)/, '.$1/$2')
    if (digits.length > 12) formatted = formatted.replace(/(\d{4})(\d)/, '$1-$2')
    return formatted.slice(0, 18)
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isCnpjValid = taxId.replace(/\D/g, '').length === 14
  const isFormValid =
    isEmailValid && isCnpjValid && password.length >= 8 && password === passwordConfirm

  const progressValue = step === 'form' ? 33 : step === 'otp' ? 66 : 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-xl space-y-8 animate-fade-in-up">
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
          <Progress value={progressValue} className="h-2 rounded-none" />

          <CardHeader className="space-y-2 pb-6 pt-8">
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                {step === 'form' && 'Seus Dados'}
                {step === 'otp' && 'Verificação em Duas Etapas'}
                {step === 'success' && 'Cadastro Concluído'}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 'form' && 'Insira as informações da sua empresa para validar o acesso.'}
                {step === 'otp' &&
                  'Insira o código de 6 dígitos que enviamos para o e-mail cadastrado.'}
                {step === 'success' && 'Sua conta foi ativada. Você já pode acessar o portal.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {step === 'form' && (
              <form
                onSubmit={handleInitRegister}
                className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="space-y-2">
                  <Label htmlFor="taxId">CNPJ</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="taxId"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      className="pl-10 h-11"
                      value={taxId}
                      onChange={(e) => {
                        setTaxId(formatCNPJ(e.target.value))
                        if (fieldErrors.taxId) setFieldErrors({ ...fieldErrors, taxId: '' })
                      }}
                      required
                      maxLength={18}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.taxId && (
                    <p className="text-sm font-medium text-destructive animate-in fade-in">
                      {fieldErrors.taxId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <MailCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      className="pl-10 h-11"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-sm font-medium text-destructive animate-in fade-in">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10 h-11"
                        placeholder="Mínimo de 8 caracteres"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                        }}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="text-sm font-medium text-destructive animate-in fade-in">
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
                        className="pl-10 h-11"
                        placeholder="Repita a senha"
                        value={passwordConfirm}
                        onChange={(e) => {
                          setPasswordConfirm(e.target.value)
                          if (fieldErrors.passwordConfirm)
                            setFieldErrors({ ...fieldErrors, passwordConfirm: '' })
                        }}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.passwordConfirm && (
                      <p className="text-sm font-medium text-destructive animate-in fade-in">
                        {fieldErrors.passwordConfirm}
                      </p>
                    )}
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
                        <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
                      </span>
                    ) : (
                      'Continuar e Enviar Código'
                    )}
                  </Button>

                  <div className="flex flex-col gap-3 text-center mt-2">
                    <Button
                      variant="ghost"
                      asChild
                      className="text-slate-600 hover:text-slate-900 mx-auto"
                    >
                      <Link to="/" className="inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Login
                      </Link>
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form
                onSubmit={handleVerifyOtp}
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                <div className="space-y-3">
                  <Label htmlFor="otp" className="text-center block text-sm">
                    Código de Verificação de 6 dígitos
                  </Label>
                  <div className="relative mx-auto max-w-[240px]">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="otp"
                      type="text"
                      className="pl-10 h-14 text-center tracking-[0.5em] text-2xl font-bold bg-white"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ''))
                        if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: '' })
                      }}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {fieldErrors.code && (
                    <p className="text-sm font-medium text-destructive text-center animate-in fade-in">
                      {fieldErrors.code}
                    </p>
                  )}
                  {mockCode && (
                    <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-100 text-center mt-4 font-medium animate-in fade-in">
                      Ambiente de teste: o código é {mockCode}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
                      </span>
                    ) : (
                      'Confirmar e Acessar'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('form')}
                    disabled={isLoading}
                    className="h-12"
                  >
                    Voltar e corrigir dados
                  </Button>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-slate-600">
                    Sua senha foi configurada e seu e-mail confirmado.
                  </p>
                  <p className="text-slate-500 text-sm">Você será redirecionado em instantes...</p>
                </div>
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
