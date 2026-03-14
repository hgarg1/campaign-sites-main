import { useEffect, useState } from 'react'

export default function PortalShell(): JSX.Element {
  const [updateMessage, setUpdateMessage] = useState<string>('')
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
  const [diagnosticsError, setDiagnosticsError] = useState<string>('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [diagnostics, setDiagnostics] = useState<{
    appName: string
    platform: string
    version: string
    authenticated: boolean
    hasSessionCookie: boolean
    portalAttached: boolean
    baseUrl: string
  } | null>(null)

  useEffect(() => {
    const cleanup = window.desktopBridge.onUpdateStatus(({ message }) => {
      setUpdateMessage(message)
    })

    const onOnline = (): void => setIsOnline(true)
    const onOffline = (): void => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      cleanup()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function openDiagnostics(): Promise<void> {
    setShowDiagnostics(true)
    setLoadingDiagnostics(true)
    setDiagnosticsError('')
    try {
      const data = await window.desktopBridge.getDiagnostics()
      setDiagnostics(data)
    } catch {
      setDiagnosticsError('Failed to load diagnostics.')
    } finally {
      setLoadingDiagnostics(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div
        className="flex items-center justify-between h-12 px-4 bg-gray-950 border-b border-gray-800 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200">System Admin</span>
        </div>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <span
            className={`text-[10px] px-2 py-0.5 rounded border ${
              isOnline
                ? 'text-emerald-300 border-emerald-700 bg-emerald-900/20'
                : 'text-amber-300 border-amber-700 bg-amber-900/20'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button
            onClick={() => {
              void openDiagnostics()
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
          >
            Diagnostics
          </button>
          <button
            onClick={() => {
              void window.desktopBridge.checkForUpdates()
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
          >
            Check update
          </button>
          <button
            onClick={() => {
              void window.desktopBridge.logout()
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
          >
            Sign out
          </button>
        </div>
      </div>

      {updateMessage ? (
        <div className="px-4 py-2 text-xs text-blue-300 bg-blue-950/40 border-b border-blue-900">
          {updateMessage}
        </div>
      ) : null}

      <div className="flex-1" />

      {showDiagnostics ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Diagnostics</h2>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Close
              </button>
            </div>
            {loadingDiagnostics ? <p className="text-sm text-gray-400">Loading...</p> : null}
            {diagnosticsError ? <p className="text-sm text-red-300">{diagnosticsError}</p> : null}
            {!loadingDiagnostics && diagnostics ? (
              <div className="text-xs text-gray-300 space-y-2">
                <p>App: {diagnostics.appName}</p>
                <p>Version: {diagnostics.version}</p>
                <p>Platform: {diagnostics.platform}</p>
                <p>Authenticated: {diagnostics.authenticated ? 'yes' : 'no'}</p>
                <p>Session cookie: {diagnostics.hasSessionCookie ? 'present' : 'missing'}</p>
                <p>Portal attached: {diagnostics.portalAttached ? 'yes' : 'no'}</p>
                <p className="break-all">Base URL: {diagnostics.baseUrl}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
