interface PortalShellProps {
  orgId: string
}

export default function PortalShell({ orgId }: PortalShellProps): JSX.Element {
  // The portal is loaded via BrowserView in the main process.
  // This renderer provides only the custom titlebar shell.
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Custom titlebar */}
      <div
        className="flex items-center justify-between h-12 px-4 bg-gray-950 border-b border-gray-800 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200">Tenant Admin</span>
          <span className="text-xs text-gray-500 font-mono">{orgId}</span>
        </div>
        <button
          onClick={() => window.desktopBridge.clearSelectedOrg()}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
        >
          Switch org
        </button>
      </div>
      {/* BrowserView fills the remaining space — positioned by main process */}
      <div className="flex-1" />
    </div>
  )
}
