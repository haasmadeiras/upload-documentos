import { Badge } from '@/components/ui/badge'
import { DocStatus } from '@/stores/use-app-store'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: DocStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'aprovado':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1.5 font-medium"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
        </Badge>
      )
    case 'em_analise':
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-600 border-blue-200 gap-1.5 font-medium"
        >
          <Clock className="w-3.5 h-3.5" /> Em Análise
        </Badge>
      )
    case 'rejeitado':
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-600 border-rose-200 gap-1.5 font-medium"
        >
          <XCircle className="w-3.5 h-3.5" /> Rejeitado
        </Badge>
      )
    case 'pendente':
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-600 border-amber-200 gap-1.5 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5" /> Pendente
        </Badge>
      )
  }
}
