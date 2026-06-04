import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  if (adminOnly) {
    const isAdmin = user.isAdmin === true || user.role === 'Admin'
    if (!isAdmin) {
      return <Navigate to="/portal" replace />
    }
  }

  return <Outlet />
}
