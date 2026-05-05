import { Link, useLocation } from 'react-router-dom'
import {
  Building2,
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  UploadCloud,
  LifeBuoy,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import useAppStore from '@/stores/use-app-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function AppSidebar() {
  const location = useLocation()
  const { user, logout } = useAppStore()

  const adminMenu = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { title: 'Regras de Documentos', icon: Settings, path: '/admin/config' },
    { title: 'Stakeholders', icon: Users, path: '/admin/stakeholders' },
  ]

  const portalMenu = [
    { title: 'Meus Documentos', icon: FileText, path: '/portal' },
    { title: 'Central de Upload', icon: UploadCloud, path: '/portal' },
    { title: 'Suporte', icon: LifeBuoy, path: '/portal' },
  ]

  const menu = user?.role === 'admin' ? adminMenu : portalMenu

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-4 px-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden">
            DocPortal
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-4">
        <SidebarMenu>
          {menu.map((item) => (
            <SidebarMenuItem key={item.path + item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.title}
              >
                <Link to={item.path} className="gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Avatar className="w-9 h-9 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <button
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
