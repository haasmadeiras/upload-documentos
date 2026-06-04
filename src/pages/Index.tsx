import { useState, useEffect } from 'react'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import useAppStore from '@/stores/use-app-store'
import { useToast } from '@/hooks/use-toast'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import logoUrl from '@/assets/image-bb79d.png'
import pb from '@/lib/pocketbase/client'

export default function Index() {
  const { login: setAppRole } = useAppStore()
  const { signIn, isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.isAdmin === true || user.role === 'Admin'
      navigate(isAdmin ? '/admin' : '/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const [email, setEmail] = useState('pamelafrantz@pamelafrantz.onmicrosoft.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setErrorMessage('Por favor, preencha todos os campos.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { error } = await signIn(normalizedEmail, password)

      if (error) {
        if (
          error.message &&
          (error.message.includes('não verificada') || error.message.includes('verify'))
        ) {
          setErrorMessage(
            "E-mail pré-cadastrado. Por favor, utilize a opção 'Cadastrar nova conta' para definir sua senha de primeiro acesso.",
          )
        } else {
          setErrorMessage('E-mail ou senha incorretos.')
        }
        setIsLoading(false)
        return
      }
      const userRecord = pb.authStore.record
      const isAdmin = userRecord?.isAdmin === true || userRecord?.role === 'Admin'
      setAppRole(isAdmin ? 'master' : 'stakeholder')
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo ao Portal de Documentação.`,
      })
      navigate(isAdmin ? '/admin' : '/dashboard')
    } catch (err) {
      setErrorMessage('Ocorreu um erro ao tentar fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errorMessage) setErrorMessage(null)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errorMessage) setErrorMessage(null)
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
              Portal de Documentos
            </h1>
            <p className="text-slate-600 text-lg">
              Ambiente para envio, validação e acompanhamento de documentos e requisitos de
              fornecedores e stakeholders.
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 z-20">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Haas Madeiras. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right Pane - Login */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in bg-white max-w-full">
        <div className="w-full max-w-md space-y-8 max-w-full">
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-8 max-w-full">
            <img
              src={logoUrl}
              alt="Haas Madeiras"
              className="h-32 max-w-full object-contain mix-blend-multiply bg-transparent"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-center px-4">
              Portal de Documentos
            </h1>
          </div>

          <Card className="border-slate-200 shadow-xl bg-slate-50">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center">Acesse sua conta</CardTitle>
              <CardDescription className="text-center text-base">
                Selecione seu perfil de acesso para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errorMessage && (
                <Alert className="bg-red-50 border-red-200 text-red-600 animate-fade-in-down shadow-sm">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-600 font-semibold text-base">
                    Falha no login
                  </AlertTitle>
                  <AlertDescription className="mt-1 flex flex-col gap-2 text-red-600/90 text-sm">
                    <span>{errorMessage}</span>
                    {errorMessage ===
                      "E-mail pré-cadastrado. Por favor, utilize a opção 'Cadastrar nova conta' para definir sua senha de primeiro acesso." && (
                      <Link
                        to="/register"
                        className="font-semibold underline underline-offset-2 text-red-700 hover:text-red-800"
                      >
                        Ir para o cadastro
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <a href="#" className="text-sm font-medium text-destructive hover:underline">
                      Esqueci minha senha
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <Button
                  className="w-full h-12 text-base shadow-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  disabled={isLoading}
                  onClick={handleLogin}
                >
                  {isLoading ? 'Conectando...' : 'ACESSAR'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="pt-4 text-center">
                <p className="text-sm text-slate-600">
                  Ainda não possui conta?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-destructive hover:underline transition-colors"
                  >
                    Cadastrar nova conta
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
