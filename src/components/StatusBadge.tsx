import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle, XCircle, Search, RefreshCw } from 'lucide-react'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = status?.toLowerCase().replace(/_/g, ' ') || 'pending'

  if (norm === 'approved' || norm === 'aprovado') {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1.5 font-medium"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
      </Badge>
    )
  }

  if (
    norm === 'correction required' ||
    norm === 'aguardando correção' ||
    norm === 'solicitar correção' ||
    norm === 'solicitar_correcao' ||
    norm === 'aguardando aprovação' ||
    norm === 'aguardando_aprovacao'
  ) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-600 border-amber-200 gap-1.5 font-medium"
      >
        <Search className="w-3.5 h-3.5" /> Aguardando Revisão Humana
      </Badge>
    )
  }

  if (norm === 'pending' || norm === 'pendente') {
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-600 border-blue-200 gap-1.5 font-medium animate-pulse"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Em Análise pela IA
      </Badge>
    )
  }

  if (norm === 'rejected' || norm === 'rejeitado') {
    return (
      <Badge
        variant="outline"
        className="bg-rose-50 text-rose-600 border-rose-200 gap-1.5 font-medium"
      >
        <XCircle className="w-3.5 h-3.5" /> Rejeitado
      </Badge>
    )
  }

  if (norm === 'expired' || norm === 'expirado' || norm === 'vencido') {
    return (
      <Badge
        variant="outline"
        className="bg-orange-50 text-orange-600 border-orange-200 gap-1.5 font-medium"
      >
        <AlertCircle className="w-3.5 h-3.5" /> Vencido
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="bg-slate-50 text-slate-600 border-slate-200 gap-1.5 font-medium"
    >
      <Clock className="w-3.5 h-3.5" /> {status}
    </Badge>
  )
}
