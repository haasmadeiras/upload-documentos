import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Loader2, ArrowLeft, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import logoUrl from '@/assets/image-bb79d.png'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Index() {
  const { signIn, isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState<'login' | 'forgot_init' | 'forgot_verify' | 'forgot_success'>(
    'login',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [mockCode, setMockCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      const isAdminOrColab =
        user.isAdmin === true || user.role === 'Admin' || user.role === 'Colaborador'
      navigate(isAdminOrColab ? '/admin' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, loading, navigate])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const { error: signInError } = await signIn(email.trim(), password)

      if (signInError) {
        const errorMsg = getErrorMessage(signInError)
        if (signInError.status === 0 || errorMsg.toLowerCase().includes('failed to fetch')) {
          setError('Erro de conexão. Verifique sua internet e tente novamente.')
        } else {
          setError('Credenciais inválidas. Verifique seu e-mail e senha.')
        }
      } else {
        const record = pb.authStore.record
        if (record) {
          const isAdminOrColab =
            record.isAdmin === true || record.role === 'Admin' || record.role === 'Colaborador'
          navigate(isAdminOrColab ? '/admin' : '/dashboard', { replace: true })
        }
      }
    } catch (err: any) {
      setError('Erro inesperado ao realizar login.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotInit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return setError('Informe seu e-mail.')
    setError('')
    setIsSubmitting(true)
    try {
      const res = await pb.send('/backend/v1/auth/reset-password-init', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMockCode(res.mock_code)
      setView('forgot_verify')
      toast.success(res.message)
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar recuperação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetCode || resetCode.length !== 6 || !newPassword) return setError('Dados incompletos.')
    if (newPassword.length < 8) return setError('A senha deve ter no mínimo 8 caracteres.')
    setError('')
    setIsSubmitting(true)
    try {
      const res = await pb.send('/backend/v1/auth/reset-password-verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: resetCode, password: newPassword }),
      })
      toast.success(res.message)
      setView('forgot_success')
      setPassword('')
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.')
    } finally {
      setIsSubmitting(false)
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
            {view === 'login' ? 'Bem-vindo(a)!' : 'Recuperar Senha'}
          </h1>
          <p className="text-slate-600 text-center max-w-sm">
            {view === 'login'
              ? 'Faça login para acessar o portal de fornecedores.'
              : 'Siga os passos para redefinir seu acesso.'}
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {view === 'login' && 'Login'}
              {view === 'forgot_init' && 'Esqueci minha senha'}
              {view === 'forgot_verify' && 'Redefinir Senha'}
              {view === 'forgot_success' && 'Senha Alterada'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <Button
                        variant="link"
                        type="button"
                        className="p-0 h-auto font-normal text-xs text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setView('forgot_init')
                          setError('')
                        }}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
                </Button>
                <div className="text-center text-sm pt-4 border-t">
                  <span className="text-muted-foreground">Primeiro acesso? </span>
                  <Link to="/cadastro" className="font-medium text-primary hover:underline">
                    Faça seu cadastro
                  </Link>
                </div>
              </form>
            )}

            {view === 'forgot_init' && (
              <form onSubmit={handleForgotInit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail Cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="nome@exemplo.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Código'}
                </Button>
                <div className="flex justify-center text-center mt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setView('login')
                      setError('')
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Login
                  </Button>
                </div>
              </form>
            )}

            {view === 'forgot_verify' && (
              <form onSubmit={handleForgotVerify} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Código enviado para <strong>{email}</strong>.
                  </p>
                  {mockCode && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                      Ambiente de teste. Código: <strong>{mockCode}</strong>
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={resetCode}
                    onChange={(val: string) => setResetCode(val)}
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
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-10 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || resetCode.length !== 6}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redefinir Senha'}
                </Button>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setView('forgot_init')}
                    className="text-slate-600"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                  </Button>
                </div>
              </form>
            )}

            {view === 'forgot_success' && (
              <div className="flex flex-col items-center justify-center py-6 space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-center text-slate-600">
                  Sua senha foi redefinida com sucesso. Você já pode acessar a plataforma.
                </p>
                <Button onClick={() => setView('login')} className="w-full">
                  Fazer Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
