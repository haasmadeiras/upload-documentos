import { useState } from 'react'
import { Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import useAppStore from '@/stores/use-app-store'
import { useToast } from '@/hooks/use-toast'

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
    <div className="min-h-screen flex w-full bg-background">
      {/* Left Pane - Image */}
      <div className="hidden lg:flex flex-1 relative bg-primary flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-primary/90 z-10" />
        <img
          src="https://img.usecurling.com/p/800/1200?q=modern%20corporate%20office&color=blue"
          alt="Corporate Office"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="relative z-20 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <span className="font-bold text-2xl text-white tracking-tight">DocPortal</span>
        </div>
        <div className="relative z-20 max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Gestão de Documentos Simplificada para sua Empresa
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Um portal seguro para envio, validação e acompanhamento de requisitos de stakeholders e
            fornecedores.
          </p>
        </div>
      </div>

      {/* Right Pane - Login */}
      <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">DocPortal</span>
          </div>

          <Card className="border-border/50 shadow-elevation">
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
                    <a href="#" className="text-sm font-medium text-accent hover:underline">
                      Esqueci minha senha
                    </a>
                  </div>
                  <Input id="password" type="password" defaultValue="123456" />
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base"
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
