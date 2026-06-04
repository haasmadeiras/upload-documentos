import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  signUp: (data: any) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (data: any) => {
    try {
      await pb.collection('users').create(data)
      await pb.collection('users').authWithPassword(data.email, data.password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword(email.trim().toLowerCase(), password)
      const isAdmin = authData.record.isAdmin === true || authData.record.role === 'Admin'
      if (!isAdmin && !authData.record.verified) {
        pb.authStore.clear()
        return { error: new Error('Conta não verificada. Por favor, conclua o cadastro primeiro.') }
      }
      return { error: null }
    } catch (error: any) {
      if (error?.status === 0) {
        return { error: new Error('Erro de conexão. Verifique sua rede e tente novamente.') }
      }
      if (error?.status === 400 || error?.status === 401 || error?.status === 404) {
        return { error: new Error('Usuário não encontrado ou senha incorreta.') }
      }
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
