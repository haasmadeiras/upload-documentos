import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 animate-fade-in">
      <FileQuestion className="w-24 h-24 text-slate-300 mb-6" />
      <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-4">Página não encontrada</h2>
      <p className="text-slate-500 mb-8 text-center max-w-md">
        A página que você está procurando não existe ou foi movida. Verifique o endereço digitado.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao Início</Link>
      </Button>
    </div>
  )
}
