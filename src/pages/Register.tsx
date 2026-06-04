import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { MailCheck, KeyRound, ShieldCheck } from 'lucide-react'
import logoUrl from '@/assets/image-bb79d.png'

export default function Register() {
  const { signIn, isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.isAdmin === true || user.role === 'Admin'
      navigate(isAdmin ? '/admin' : '/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const location = useLocation()
  const [step, setStep] = useState<'email' | 'password' | 'otp'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [mockCode, setMockCode] = useState('')

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setIsLoading(true)

    try {
      await pb.send('/backend/v1/auth/invite-check', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setStep('password')
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else if (
        err.status === 404 ||
        err.status === 400 ||
        (err.message && err.message.toLowerCase().includes('not found'))
      ) {
        setFieldErrors({
          email: 'E-mail não autorizado para cadastro. Entre em contato com o administrador.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: err.message || 'Erro ao verificar e-mail.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (password !== passwordConfirm) {
      setFieldErrors({ passwordConfirm: 'As senhas não coincidem.' })
      return
    }

    setIsLoading(true)
    try {
      const res = await pb.send('/backend/v1/auth/invite-setup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      setMockCode(res.mock_code)
      setStep('otp')
      toast({
        title: 'Código enviado!',
        description: `Simulação de envio por e-mail. O código é: ${res.mock_code}`,
      })
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: err.message || 'Erro ao configurar senha.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setIsLoading(true)

    try {
      await pb.send('/backend/v1/auth/invite-verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: otp, password }),
      })

      // Account verified, now login
      const { error } = await signIn(email, password)
      if (error) {
        throw error
      }

      toast({
        title: 'Conta ativada com sucesso!',
        description: 'Bem-vindo ao portal.',
      })
      navigate('/dashboard')
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de Verificação',
          description: err.message || 'Código inválido.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-white">
      {/* Left Pane - Image & Brand */}
      <div className="hidden lg:flex flex-1 relative bg-white flex-col justify-center items-center p-12 overflow-hidden border-r border-slate-100 max-w-full">
        <div className="relative z-20 flex flex-col items-center gap-8 max-w-lg text-center">
          <img
            src={logoUrl}
            alt="Haas Madeiras"
            className="w-80 object-contain mix-blend-multiply bg-transparent"
          />

          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-slate-900 leading-tight tracking-tight">
              Junte-se ao Portal
            </h1>
            <p className="text-slate-600 text-lg">
              Conclua seu cadastro para enviar documentos e acompanhar os requisitos da sua empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane - Register */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in bg-white max-w-full">
        <div className="w-full max-w-md space-y-8 max-w-full">
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-8 max-w-full">
            <img
              src={logoUrl}
              alt="Haas Madeiras"
              className="h-32 max-w-full object-contain mix-blend-multiply bg-transparent"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-center px-4">
              Cadastro
            </h1>
          </div>

          <Card className="border-slate-200 shadow-xl bg-slate-50">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center">
                {step === 'email' && 'Verificar Convite'}
                {step === 'password' && 'Definir Senha'}
                {step === 'otp' && 'Validação em Duas Etapas'}
              </CardTitle>
              <CardDescription className="text-center text-base">
                {step === 'email' && 'Insira o e-mail que foi convidado pelo administrador.'}
                {step === 'password' && 'Crie uma senha segura para o seu acesso.'}
                {step === 'otp' && 'Insira o código de 6 dígitos que enviamos para seu e-mail.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'email' && (
                <form
                  onSubmit={handleCheckEmail}
                  className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail corporativo</Label>
                    <div className="relative">
                      <MailCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nome@empresa.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setFieldErrors({})
                        }}
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="pt-4 space-y-4">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isLoading || !email}
                    >
                      {isLoading ? 'Verificando...' : 'Continuar'}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-slate-600">
                        Já possui conta?{' '}
                        <Link
                          to="/"
                          className="font-semibold text-primary hover:underline transition-colors"
                        >
                          Fazer Login
                        </Link>
                      </p>
                    </div>
                  </div>
                </form>
              )}

              {step === 'password' && (
                <form
                  onSubmit={handleSetPassword}
                  className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500"
                >
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10"
                        placeholder="Mínimo de 8 caracteres"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setFieldErrors({})
                        }}
                        required
                        minLength={8}
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-red-500">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">Confirmar Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="passwordConfirm"
                        type="password"
                        className="pl-10"
                        placeholder="Repita a senha"
                        value={passwordConfirm}
                        onChange={(e) => {
                          setPasswordConfirm(e.target.value)
                          setFieldErrors({})
                        }}
                        required
                        minLength={8}
                      />
                    </div>
                    {fieldErrors.passwordConfirm && (
                      <p className="text-xs text-red-500">{fieldErrors.passwordConfirm}</p>
                    )}
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isLoading || !password || !passwordConfirm}
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Senha'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep('email')}
                      disabled={isLoading}
                    >
                      Voltar
                    </Button>
                  </div>
                </form>
              )}

              {step === 'otp' && (
                <form
                  onSubmit={handleVerifyOtp}
                  className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500"
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp">Código de Verificação</Label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="otp"
                        type="text"
                        className="pl-10 text-center tracking-widest text-lg font-semibold"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ''))
                          setFieldErrors({})
                        }}
                        required
                      />
                    </div>
                    {fieldErrors.code && <p className="text-xs text-red-500">{fieldErrors.code}</p>}
                    {mockCode && (
                      <p className="text-xs text-blue-600 text-center mt-2 font-medium">
                        Simulação: o código é {mockCode}
                      </p>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? 'Verificando...' : 'Verificar e Acessar'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
