import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-slate-500">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  if (adminOnly) {
    const isAdminOrColab =
      user.isAdmin === true || user.role === 'Admin' || user.role === 'Colaborador'
    if (!isAdminOrColab) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Outlet />
}
