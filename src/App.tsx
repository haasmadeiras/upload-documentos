import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppStoreProvider } from '@/stores/use-app-store'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import Index from './pages/Index'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminConfig from './pages/admin/Config'
import AdminSuppliers from './pages/admin/Suppliers'
import AdminEmployees from './pages/admin/Employees'
import AdminVehicles from './pages/admin/Vehicles'
import AdminContracts from './pages/admin/Contracts'
import AdminForests from './pages/admin/Forests'
import AdminUsers from './pages/admin/Users'
import AdminAuditLogs from './pages/admin/AuditLogs'
import PortalDashboard from './pages/portal/Dashboard'
import PortalUpload from './pages/portal/Upload'
import PortalEmployeeDetails from './pages/portal/EmployeeDetails'
import PortalEmployees from './pages/portal/Employees'
import AdminCategoryDocuments from './pages/admin/CategoryDocuments'
import AdminPendingDocuments from './pages/admin/PendingDocuments'
import AdminExpiringDocuments from './pages/admin/ExpiringDocuments'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <AppStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Index />} />
            <Route path="/cadastro" element={<Register />} />

            <Route element={<Layout />}>
              <Route element={<ProtectedRoute adminOnly />}>
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/config" element={<AdminConfig />} />
                <Route path="/admin/suppliers" element={<AdminSuppliers />} />
                <Route path="/admin/employees" element={<AdminEmployees />} />
                <Route path="/admin/vehicles" element={<AdminVehicles />} />
                <Route path="/admin/contracts" element={<AdminContracts />} />
                <Route path="/admin/forests" element={<AdminForests />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                <Route path="/admin/employees/:id" element={<PortalEmployeeDetails />} />
                <Route
                  path="/admin/documents/category/:categoryId"
                  element={<AdminCategoryDocuments />}
                />
                <Route path="/admin/documents/pending" element={<AdminPendingDocuments />} />
                <Route path="/admin/documents/expiring" element={<AdminExpiringDocuments />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                {/* Dashboard Routes */}
                <Route path="/dashboard" element={<PortalDashboard />} />
                {/* Portal Routes */}
                <Route path="/portal" element={<PortalDashboard />} />
                <Route path="/portal/upload/:id" element={<PortalUpload />} />
                <Route path="/portal/employees" element={<PortalEmployees />} />
                <Route path="/portal/employees/:id" element={<PortalEmployeeDetails />} />{' '}
                <Route path="/portal/fornecedor" element={<PortalDashboard />} />
                <Route path="/portal/veiculos" element={<PortalDashboard />} />
                <Route path="/portal/contratados" element={<PortalDashboard />} />
                <Route path="/portal/florestas" element={<PortalDashboard />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AppStoreProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
