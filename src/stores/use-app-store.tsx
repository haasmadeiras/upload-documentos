import React, { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'admin' | 'stakeholder'
export type DocStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'

export interface User {
  id: string
  name: string
  role: UserRole
  category?: string
}

export interface Requirement {
  id: string
  categoryId: string
  title: string
  description: string
  isMandatory: boolean
}

export interface UploadedDoc {
  id: string
  requirementId: string
  supplierId: string
  status: DocStatus
  fileName: string
  uploadedAt: string
}

interface AppState {
  user: User | null
  requirements: Requirement[]
  uploads: UploadedDoc[]
  login: (role: UserRole) => void
  logout: () => void
  addRequirement: (req: Omit<Requirement, 'id'>) => void
  addUpload: (upload: Omit<UploadedDoc, 'id' | 'uploadedAt' | 'status'>) => void
}

const MOCK_REQUIREMENTS: Requirement[] = [
  {
    id: 'r1',
    categoryId: 'fornecedor-ti',
    title: 'Contrato Social',
    description: 'Cópia atualizada do contrato social.',
    isMandatory: true,
  },
  {
    id: 'r2',
    categoryId: 'fornecedor-ti',
    title: 'Certidão Negativa de Débitos',
    description: 'CND Federal e Estadual.',
    isMandatory: true,
  },
  {
    id: 'r3',
    categoryId: 'fornecedor-ti',
    title: 'Apolice de Seguro',
    description: 'Seguro de responsabilidade civil.',
    isMandatory: false,
  },
]

const MOCK_UPLOADS: UploadedDoc[] = [
  {
    id: 'u1',
    requirementId: 'r1',
    supplierId: 's1',
    status: 'aprovado',
    fileName: 'contrato_social_v2.pdf',
    uploadedAt: '2023-10-01',
  },
  {
    id: 'u2',
    requirementId: 'r2',
    supplierId: 's1',
    status: 'em_analise',
    fileName: 'cnd_federal_2023.pdf',
    uploadedAt: '2023-10-15',
  },
]

const AppContext = createContext<AppState | undefined>(undefined)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>(MOCK_REQUIREMENTS)
  const [uploads, setUploads] = useState<UploadedDoc[]>(MOCK_UPLOADS)

  const login = (role: UserRole) => {
    if (role === 'admin') {
      setUser({ id: 'a1', name: 'Maria Silva (Admin)', role: 'admin' })
    } else {
      setUser({
        id: 's1',
        name: 'TechSolutions Ltda.',
        role: 'stakeholder',
        category: 'fornecedor-ti',
      })
    }
  }

  const logout = () => setUser(null)

  const addRequirement = (req: Omit<Requirement, 'id'>) => {
    setRequirements([...requirements, { ...req, id: `r${Date.now()}` }])
  }

  const addUpload = (upload: Omit<UploadedDoc, 'id' | 'uploadedAt' | 'status'>) => {
    const newUpload: UploadedDoc = {
      ...upload,
      id: `u${Date.now()}`,
      status: 'em_analise',
      uploadedAt: new Date().toISOString().split('T')[0],
    }
    // Remove previous upload for the same requirement to simulate override
    setUploads((prev) => [
      ...prev.filter((u) => u.requirementId !== upload.requirementId),
      newUpload,
    ])
  }

  return (
    <AppContext.Provider
      value={{ user, requirements, uploads, login, logout, addRequirement, addUpload }}
    >
      {children}
    </AppContext.Provider>
  )
}

export default function useAppStore() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider')
  return context
}
