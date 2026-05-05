import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings, FolderLock, Users, LogOut, Files, LifeBuoy } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useApp } from '@/contexts/AppContext'
import logoUrl from '@/assets/image-bb79d.png'

export function AppSidebar() {
  const { user, logout } = useApp()

  const masterItems = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
    { title: 'Configurar Regras', url: '/admin/config', icon: Settings },
    { title: 'Stakeholders', url: '/admin/stakeholders', icon: Users },
    { title: 'Documentos', url: '/admin/documents', icon: FolderLock },
  ]

  const stakeholderItems = [
    { title: 'Meu Painel', url: '/portal', icon: LayoutDashboard },
    { title: 'Central de Upload', url: '/portal/upload', icon: Files },
    { title: 'Suporte', url: '/portal/support', icon: LifeBuoy },
  ]

  const items = user?.role === 'master' ? masterItems : stakeholderItems

  return (
    <Sidebar variant="inset" className="border-r shadow-sm">
      <SidebarHeader className="p-4 flex flex-col justify-center">
        <img src={logoUrl} alt="Haas Madeiras" className="h-12 w-auto object-contain mb-2 px-2" />
        <div className="flex flex-col gap-0.5 leading-none text-center mt-1">
          <span className="text-xs font-medium text-muted-foreground">
            {user?.role === 'master' ? 'Gestão Corporativa' : 'Portal do Fornecedor'}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin' || item.url === '/portal'}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : ''
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenuButton
          onClick={logout}
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}
