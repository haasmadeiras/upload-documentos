import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import logoUrl from '@/assets/image-bb79d.png'

export default function Register() {
  const { signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }))
    if (fieldErrors[e.target.id]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.id]: '' }))
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (formData.password !== formData.passwordConfirm) {
      setFieldErrors({ passwordConfirm: 'As senhas não coincidem.' })
      return
    }

    setIsLoading(true)
    const { error } = await signUp(formData)
    setIsLoading(false)

    if (error) {
      const extractedErrors = extractFieldErrors(error)
      if (Object.keys(extractedErrors).length > 0) {
        setFieldErrors(extractedErrors)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro no cadastro',
          description: error.message || 'Ocorreu um erro inesperado ao criar sua conta.',
        })
      }
      return
    }

    toast({
      title: 'Conta criada com sucesso!',
      description: 'Você já pode acessar o portal.',
    })
    navigate('/dashboard')
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
              Cadastre sua conta para enviar documentos e acompanhar os requisitos da sua empresa.
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
              <CardTitle className="text-2xl text-center">Crie sua conta</CardTitle>
              <CardDescription className="text-center text-base">
                Preencha os dados abaixo para se cadastrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-500">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar Senha</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  {fieldErrors.passwordConfirm && (
                    <p className="text-xs text-red-500">{fieldErrors.passwordConfirm}</p>
                  )}
                </div>

                <div className="pt-4 space-y-4">
                  <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                    {isLoading ? 'Cadastrando...' : 'Finalizar Cadastro'}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
