import { Bell, Menu } from 'lucide-react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'

export function AppHeader() {
  const { isMobile } = useSidebar()
  const location = useLocation()

  const getTitle = () => {
    if (location.pathname.includes('/config')) return 'Configuração de Documentos'
    if (location.pathname.includes('/stakeholders')) return 'Gestão de Stakeholders'
    if (location.pathname.includes('/upload')) return 'Detalhes do Documento'
    return 'Dashboard'
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <h1 className="text-lg font-semibold tracking-tight">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full border border-background"></span>
        </Button>
      </div>
    </header>
  )
}
