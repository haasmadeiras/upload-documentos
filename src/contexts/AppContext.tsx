import React, { createContext, useContext, useState, ReactNode } from 'react'
import { RequirementGroup, UploadedDoc, User, Requirement } from '@/lib/types'
import { mockGroups, mockUploads, mockUsers } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface AppContextType {
  user: User | null
  login: (role: 'master' | 'stakeholder') => void
  logout: () => void
  groups: RequirementGroup[]
  addGroup: (name: string) => void
  addRequirement: (groupId: string, req: Omit<Requirement, 'id'>) => void
  deleteRequirement: (groupId: string, reqId: string) => void
  uploads: UploadedDoc[]
  uploadDocument: (reqId: string, file: File) => void
  updateDocumentStatus: (uploadId: string, status: UploadedDoc['status']) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<RequirementGroup[]>(mockGroups)
  const [uploads, setUploads] = useState<UploadedDoc[]>(mockUploads)
  const { toast } = useToast()
  const navigate = useNavigate()

  const login = (role: 'master' | 'stakeholder') => {
    const loggedInUser = mockUsers.find((u) => u.role === role) || null
    setUser(loggedInUser)
    if (role === 'master') {
      navigate('/admin')
    } else {
      navigate('/portal')
    }
    toast({
      title: 'Login realizado com sucesso',
      description: `Bem-vindo ao Portal, ${loggedInUser?.name}.`,
    })
  }

  const logout = () => {
    setUser(null)
    navigate('/')
  }

  const addGroup = (name: string) => {
    setGroups([...groups, { id: `g${Date.now()}`, name, requirements: [] }])
    toast({ title: 'Grupo criado', description: `Grupo ${name} adicionado com sucesso.` })
  }

  const addRequirement = (groupId: string, req: Omit<Requirement, 'id'>) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, requirements: [...g.requirements, { ...req, id: `r${Date.now()}` }] }
          : g,
      ),
    )
    toast({ title: 'Requisito adicionado', description: 'O documento foi adicionado à lista.' })
  }

  const deleteRequirement = (groupId: string, reqId: string) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, requirements: g.requirements.filter((r) => r.id !== reqId) } : g,
      ),
    )
    toast({ title: 'Requisito removido', variant: 'destructive' })
  }

  const uploadDocument = (reqId: string, file: File) => {
    const newUpload: UploadedDoc = {
      id: `u${Date.now()}`,
      reqId,
      status: 'Em Análise',
      fileName: file.name,
      uploadDate: new Date().toISOString(),
    }
    setUploads([...uploads.filter((u) => u.reqId !== reqId), newUpload])
  }

  const updateDocumentStatus = (uploadId: string, status: UploadedDoc['status']) => {
    setUploads(uploads.map((u) => (u.id === uploadId ? { ...u, status } : u)))
  }

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        groups,
        addGroup,
        addRequirement,
        deleteRequirement,
        uploads,
        uploadDocument,
        updateDocumentStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
