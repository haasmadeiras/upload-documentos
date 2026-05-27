import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  FolderLock,
  Users,
  UserCog,
  LogOut,
  ChevronRight,
  FileText,
  Truck,
  Briefcase,
  TreePine,
  Folder,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import logoUrl from '@/assets/image-bb79d.png'

export function AppSidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [categories, setCategories] = useState<any[]>([])

  const isMaster = user?.isAdmin === true || user?.role === 'Admin'

  useEffect(() => {
    if (!isMaster) return
    pb.collection('document_categories')
      .getFullList({ sort: 'name' })
      .then((data) => setCategories(data))
      .catch(() => {})
  }, [isMaster])

  useRealtime(
    'document_categories',
    (e) => {
      if (e.action === 'create') {
        setCategories((prev) => [...prev, e.record].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (e.action === 'update') {
        setCategories((prev) =>
          prev
            .map((c) => (c.id === e.record.id ? e.record : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
      } else if (e.action === 'delete') {
        setCategories((prev) => prev.filter((c) => c.id !== e.record.id))
      }
    },
    isMaster,
  )

  const masterItems = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
    { title: 'Usuários', url: '/admin/users', icon: UserCog },
    { title: 'Regras de Documentos', url: '/admin/config', icon: Settings },
    {
      title: 'Documentos por Categoria',
      icon: Folder,
      subItems: categories.map((c) => ({
        title: c.name,
        url: `/admin/documents/category/${c.id}`,
      })),
    },
    { title: 'Fornecedores', url: '/admin/suppliers', icon: Users },
    { title: 'Funcionários', url: '/admin/employees', icon: Users },
    { title: 'Veículos', url: '/admin/vehicles', icon: Truck },
    { title: 'Contratados', url: '/admin/contracts', icon: Briefcase },
    { title: 'Florestas', url: '/admin/forests', icon: TreePine },
  ]

  const stakeholderItems = [
    { title: 'Meu Painel', url: '/portal', icon: LayoutDashboard },
    {
      title: 'Meus Documentos',
      icon: FileText,
      subItems: [
        { title: 'FORNECEDOR', url: '/portal/fornecedor' },
        { title: 'FUNCIONÁRIOS', url: '/portal/employees' },
        { title: 'VEÍCULOS', url: '/portal/veiculos' },
        { title: 'CONTRATADOS', url: '/portal/contratados' },
        { title: 'FLORESTAS', url: '/portal/florestas' },
      ],
    },
  ]

  const items = isMaster ? masterItems : stakeholderItems

  return (
    <Sidebar variant="inset" className="border-r shadow-sm">
      <SidebarHeader className="p-4 flex flex-col justify-center">
        <img
          src={logoUrl}
          alt="Haas Madeiras"
          className="h-12 w-auto object-contain mb-2 px-2 mix-blend-multiply"
        />
        <div className="flex flex-col gap-0.5 leading-none text-center mt-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isMaster ? 'Gestão Corporativa' : 'Portal do Fornecedor'}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {'subItems' in item && item.subItems ? (
                    <Collapsible
                      defaultOpen={item.subItems.some((sub) =>
                        location.pathname.startsWith(sub.url),
                      )}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  location.pathname === subItem.url ||
                                  location.pathname.startsWith(subItem.url + '/')
                                }
                              >
                                <NavLink to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url!}
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
                  )}
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
            <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenuButton
          onClick={() => {
            signOut()
          }}
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
