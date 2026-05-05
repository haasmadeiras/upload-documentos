import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppStoreProvider } from '@/stores/use-app-store'
import Layout from './components/Layout'
import Index from './pages/Index'
import AdminDashboard from './pages/admin/Dashboard'
import AdminConfig from './pages/admin/Config'
import AdminStakeholders from './pages/admin/Stakeholders'
import PortalDashboard from './pages/portal/Dashboard'
import PortalUpload from './pages/portal/Upload'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AppStoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/admin/stakeholders" element={<AdminStakeholders />} />

            {/* Portal Routes */}
            <Route path="/portal" element={<PortalDashboard />} />
            <Route path="/portal/upload/:id" element={<PortalUpload />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AppStoreProvider>
  </BrowserRouter>
)

export default App
