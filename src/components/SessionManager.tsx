import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import useAppStore from '@/stores/use-app-store'

export function SessionManager() {
  const { isAuthenticated, signOut } = useAuth()
  const appStore = useAppStore()
  const clearAppStore = appStore?.logout || (() => appStore?.login?.(null)) || (() => {})
  const navigate = useNavigate()
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const INACTIVITY_TIME = 30 * 60 * 1000 // 30 minutes

  const performLogout = useCallback(
    (reason: 'inactivity' | 'manual') => {
      signOut()
      clearAppStore()
      navigate('/login', { replace: true })

      if (reason === 'inactivity') {
        toast({
          title: 'Sessão expirada',
          description: 'Sessão expirada por inatividade.',
          variant: 'destructive',
        })
      }
    },
    [signOut, clearAppStore, navigate, toast],
  )

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => performLogout('inactivity'), INACTIVITY_TIME)
    }
  }, [isAuthenticated, performLogout])

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    resetTimer()
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    const handler = () => resetTimer()

    events.forEach((e) => document.addEventListener(e, handler))

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isAuthenticated, resetTimer])

  useEffect(() => {
    const handleManualLogout = () => {
      performLogout('manual')
      toast({
        description: 'Sessão encerrada com sucesso.',
      })
    }
    window.addEventListener('app:manual-logout', handleManualLogout)
    return () => window.removeEventListener('app:manual-logout', handleManualLogout)
  }, [performLogout, toast])

  return null
}
