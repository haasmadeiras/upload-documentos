import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import useAppStore from '@/stores/use-app-store'

export default function Layout() {
  const { user } = useAppStore()
  const location = useLocation()

  // Protect routes and redirect to index if not logged in
  if (!user && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  // Redirect logged in users away from index
  if (user && location.pathname === '/') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />
  }

  // If on index and not logged in, render just the outlet (login page)
  if (!user && location.pathname === '/') {
    return <Outlet />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background min-h-screen">
        <AppHeader />
        <main className="flex-1 p-4 md:p-8 animate-fade-in w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
