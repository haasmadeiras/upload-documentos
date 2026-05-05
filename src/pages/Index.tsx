import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import useAppStore from '@/stores/use-app-store'
import { useToast } from '@/hooks/use-toast'
import logoUrl from '@/assets/image-bb79d.png'

export default function Index() {
  const { login } = useAppStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleMockLogin = (role: 'admin' | 'stakeholder') => {
    setIsLoading(true)
    setTimeout(() => {
      login(role)
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo ao Portal de Documentação.`,
      })
    }, 800)
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input
                    id="email"
                    placeholder="nome@empresa.com"
                    defaultValue="demo@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <a href="#" className="text-sm font-medium text-primary hover:underline">
                      Esqueci minha senha
                    </a>
                  </div>
                  <Input id="password" type="password" defaultValue="123456" />
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <Button
                  className="w-full h-12 text-base shadow-sm"
                  disabled={isLoading}
                  onClick={() => handleMockLogin('admin')}
                >
                  {isLoading ? 'Conectando...' : 'Acesso Colaborador'}{' '}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2"
                  disabled={isLoading}
                  onClick={() => handleMockLogin('stakeholder')}
                >
                  Acesso Fornecedor / Stakeholder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
