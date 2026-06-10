import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

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

  if (norm === 'pending final approval' || norm === 'aguardando aprovação final') {
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-600 border-blue-200 gap-1.5 font-medium"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Revisão Final
      </Badge>
    )
  }

  if (norm === 'em análise' || norm === 'em_analise' || norm === 'pending') {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-600 border-amber-200 gap-1.5 font-medium"
      >
        <Clock className="w-3.5 h-3.5" /> Em Análise (IA)
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

  if (norm === 'expired' || norm === 'expirado') {
    return (
      <Badge
        variant="outline"
        className="bg-orange-50 text-orange-600 border-orange-200 gap-1.5 font-medium"
      >
        <AlertCircle className="w-3.5 h-3.5" /> Expirado
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="bg-slate-50 text-slate-600 border-slate-200 gap-1.5 font-medium"
    >
      <AlertCircle className="w-3.5 h-3.5" /> Pendente
    </Badge>
  )
}
