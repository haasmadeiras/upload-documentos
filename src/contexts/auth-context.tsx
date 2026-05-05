import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export type Role = 'admin' | 'stakeholder' | null

interface AuthContextType {
  role: Role
  login: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null)

  const login = (newRole: Role) => {
    setRole(newRole)
  }

  const logout = () => {
    setRole(null)
  }

  return <AuthContext.Provider value={{ role, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
