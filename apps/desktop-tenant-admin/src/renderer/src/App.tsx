import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import OrgPickerPage from './pages/OrgPickerPage'
import PortalShell from './pages/PortalShell'

declare global {
  interface Window {
    desktopBridge: {
      getAuthState: () => Promise<{ authenticated: boolean; selectedOrgId: string | null }>
      loginSuccess: (token: string) => Promise<{ success: boolean }>
      logout: () => Promise<{ success: boolean }>
      selectOrg: (orgId: string) => Promise<{ success: boolean }>
      getPlatform: () => Promise<string>
      getVersion: () => Promise<string>
      onAuthStateChanged: (
        cb: (state: { authenticated: boolean; selectedOrgId?: string | null }) => void
      ) => () => void
      onOrgSelected: (cb: (data: { orgId: string }) => void) => () => void
    }
  }
}

type AppState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'pick-org' }
  | { phase: 'portal'; orgId: string }

export default function App(): JSX.Element {
  const [appState, setAppState] = useState<AppState>({ phase: 'loading' })

  useEffect(() => {
    window.desktopBridge.getAuthState().then(({ authenticated, selectedOrgId }) => {
      if (!authenticated) {
        setAppState({ phase: 'unauthenticated' })
      } else if (!selectedOrgId) {
        setAppState({ phase: 'pick-org' })
      } else {
        setAppState({ phase: 'portal', orgId: selectedOrgId })
      }
    })

    const cleanupAuth = window.desktopBridge.onAuthStateChanged(
      ({ authenticated, selectedOrgId }) => {
        if (!authenticated) {
          setAppState({ phase: 'unauthenticated' })
        } else if (!selectedOrgId) {
          setAppState({ phase: 'pick-org' })
        } else {
          setAppState({ phase: 'portal', orgId: selectedOrgId! })
        }
      }
    )

    const cleanupOrg = window.desktopBridge.onOrgSelected(({ orgId }) => {
      setAppState({ phase: 'portal', orgId })
    })

    return () => {
      cleanupAuth()
      cleanupOrg()
    }
  }, [])

  if (appState.phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (appState.phase === 'unauthenticated') {
    return (
      <LoginPage
        onSuccess={() => setAppState({ phase: 'pick-org' })}
      />
    )
  }

  if (appState.phase === 'pick-org') {
    return (
      <OrgPickerPage
        onOrgSelected={(orgId) => setAppState({ phase: 'portal', orgId })}
      />
    )
  }

  return <PortalShell orgId={appState.orgId} />
}
