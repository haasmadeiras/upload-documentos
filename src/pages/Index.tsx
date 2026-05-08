import { useState } from 'react'
import { ArrowRight, AlertCircle } from 'lucide-react'
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
  const { signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('demo@empresa.com')
  const [password, setPassword] = useState('123456')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const checkRes = await pb.send('/backend/v1/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!checkRes.exists) {
        setErrorMessage('O e-mail informado não possui cadastro na plataforma.')
        setIsLoading(false)
        return
      }

      const { error } = await signIn(email, password)

      if (error) {
        setErrorMessage('Senha incorreta.')
        setIsLoading(false)
        return
      }

      setAppRole('stakeholder')
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo ao Portal de Documentação.`,
      })
      navigate('/dashboard')
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
                <Alert variant="destructive" className="animate-fade-in-down">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Falha no login</AlertTitle>
                  <AlertDescription className="mt-1 flex flex-col gap-2">
                    <span>{errorMessage}</span>
                    {errorMessage === 'O e-mail informado não possui cadastro na plataforma.' && (
                      <Link to="/register" className="font-semibold underline underline-offset-2">
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
                    <a href="#" className="text-sm font-medium text-primary hover:underline">
                      Esqueci minha senha
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <Button
                  className="w-full h-12 text-base shadow-sm"
                  disabled={isLoading}
                  onClick={handleLogin}
                >
                  {isLoading ? 'Conectando...' : 'Acessar Dashboard'}{' '}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="pt-4 text-center">
                <p className="text-sm text-slate-600">
                  Ainda não possui conta?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-primary hover:underline transition-colors"
                  >
                    CADASTRAR MINHA CONTA
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
