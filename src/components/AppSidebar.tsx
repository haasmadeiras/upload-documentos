import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  ChevronRight,
  Truck,
  Briefcase,
  TreePine,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import useAppStore from '@/stores/use-app-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import logoUrl from '@/assets/image-bb79d.png'

export function AppSidebar() {
  const location = useLocation()
  const { user, logout } = useAppStore()

  const adminMenu = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { title: 'Regras de Documentos', icon: Settings, path: '/admin/config' },
    { title: 'Fornecedores', icon: Users, path: '/admin/suppliers' },
    { title: 'Funcionários', icon: Users, path: '/admin/employees' },
    { title: 'Veículos', icon: Truck, path: '/admin/vehicles' },
    { title: 'Contratados', icon: Briefcase, path: '/admin/contracts' },
    { title: 'Florestas', icon: TreePine, path: '/admin/forests' },
  ]

  const portalMenu = [
    { title: 'Meu Painel', icon: LayoutDashboard, path: '/portal' },
    {
      title: 'Meus Documentos',
      icon: FileText,
      subItems: [
        { title: 'FORNECEDOR', path: '/portal/fornecedor' },
        { title: 'FUNCIONÁRIOS', path: '/portal/employees' },
        { title: 'VEÍCULOS', path: '/portal/veiculos' },
        { title: 'CONTRATADOS', path: '/portal/contratados' },
        { title: 'FLORESTAS', path: '/portal/florestas' },
      ],
    },
  ]

  const menu = user?.role === 'admin' ? adminMenu : portalMenu

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-4 px-4">
        <div className="flex items-center justify-center px-2 py-2">
          <img
            src={logoUrl}
            alt="Haas Madeiras"
            className="h-10 object-contain group-data-[collapsible=icon]:hidden"
          />
          <div className="hidden group-data-[collapsible=icon]:flex w-8 h-8 bg-primary rounded-md items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">H</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-4">
        <SidebarMenu>
          {menu.map((item) => (
            <SidebarMenuItem key={item.title}>
              {'subItems' in item && item.subItems ? (
                <Collapsible
                  defaultOpen={item.subItems.some((sub) => location.pathname.startsWith(sub.path))}
                  className="group/collapsible"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
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
                              location.pathname === subItem.path ||
                              location.pathname.startsWith(subItem.path + '/')
                            }
                          >
                            <Link to={subItem.path}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                >
                  <Link to={item.path!} className="gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
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
