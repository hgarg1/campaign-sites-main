import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import PortalShell from './pages/PortalShell'

declare global {
  interface Window {
    desktopBridge: {
      getAuthState: () => Promise<{ authenticated: boolean }>
      loginSuccess: () => Promise<{ success: boolean }>
      logout: () => Promise<{ success: boolean }>
      getPlatform: () => Promise<string>
      getVersion: () => Promise<string>
      onAuthStateChanged: (cb: (state: { authenticated: boolean }) => void) => () => void
    }
  }
}

export default function App(): JSX.Element {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    window.desktopBridge
      .getAuthState()
      .then(({ authenticated }) => {
        setAuthenticated(authenticated)
      })
      .catch(() => setAuthenticated(false))

    const cleanup = window.desktopBridge.onAuthStateChanged(({ authenticated }) => {
      setAuthenticated(authenticated)
    })

    return cleanup
  }, [])

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!authenticated) {
    return <LoginPage onSuccess={() => setAuthenticated(true)} />
  }

  return <PortalShell />
}
