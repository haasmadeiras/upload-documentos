import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppStoreProvider } from '@/stores/use-app-store'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from './components/Layout'
import Index from './pages/Index'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminConfig from './pages/admin/Config'
import AdminSuppliers from './pages/admin/Suppliers'
import AdminEmployees from './pages/admin/Employees'
import AdminVehicles from './pages/admin/Vehicles'
import AdminContracts from './pages/admin/Contracts'
import AdminForests from './pages/admin/Forests'
import PortalDashboard from './pages/portal/Dashboard'
import PortalUpload from './pages/portal/Upload'
import PortalEmployeeDetails from './pages/portal/EmployeeDetails'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AppStoreProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/register" element={<Register />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/config" element={<AdminConfig />} />
              <Route path="/admin/suppliers" element={<AdminSuppliers />} />
              <Route path="/admin/employees" element={<AdminEmployees />} />
              <Route path="/admin/vehicles" element={<AdminVehicles />} />
              <Route path="/admin/contracts" element={<AdminContracts />} />
              <Route path="/admin/forests" element={<AdminForests />} />
              <Route path="/admin/employees/:id" element={<PortalEmployeeDetails />} />

              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<PortalDashboard />} />

              {/* Portal Routes */}
              <Route path="/portal" element={<PortalDashboard />} />
              <Route path="/portal/upload/:id" element={<PortalUpload />} />
              <Route path="/portal/employees" element={<PortalDashboard />} />
              <Route path="/portal/employees/:id" element={<PortalEmployeeDetails />} />
              <Route path="/portal/fornecedor" element={<PortalDashboard />} />
              <Route path="/portal/veiculos" element={<PortalDashboard />} />
              <Route path="/portal/contratados" element={<PortalDashboard />} />
              <Route path="/portal/florestas" element={<PortalDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </AppStoreProvider>
  </BrowserRouter>
)

export default App
