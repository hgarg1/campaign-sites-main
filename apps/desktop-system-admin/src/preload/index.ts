import { contextBridge, ipcRenderer } from 'electron'

const desktopBridge = {
  // Auth
  getAuthState: (): Promise<{ authenticated: boolean }> =>
    ipcRenderer.invoke('get-auth-state'),
  loginSuccess: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('login-success'),
  logout: (): Promise<{ success: boolean }> => ipcRenderer.invoke('logout'),

  // System
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
  getDiagnostics: (): Promise<{
    appName: string
    platform: string
    version: string
    authenticated: boolean
    hasSessionCookie: boolean
    portalAttached: boolean
    baseUrl: string
  }> => ipcRenderer.invoke('get-diagnostics'),
  checkForUpdates: (): Promise<{ success: boolean }> => ipcRenderer.invoke('check-for-updates'),

  // Notifications
  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('show-notification', { title, body }),
  updateBadge: (count: number): Promise<void> => ipcRenderer.invoke('update-badge', count),
  onNotification: (cb: (data: { title: string; body: string }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { title: string; body: string }): void => cb(data)
    ipcRenderer.on('portal-notification', listener)
    return () => ipcRenderer.removeListener('portal-notification', listener)
  },

  // Auth state changes pushed from main process
  onAuthStateChanged: (cb: (state: { authenticated: boolean }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { authenticated: boolean }): void => cb(state)
    ipcRenderer.on('auth-state-changed', listener)
    return () => ipcRenderer.removeListener('auth-state-changed', listener)
  },

  // Focus notifications
  onFocusNotifications: (cb: () => void): (() => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('focus-notifications', listener)
    return () => ipcRenderer.removeListener('focus-notifications', listener)
  },
  onUpdateStatus: (cb: (status: { stage: string; message: string }) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: { stage: string; message: string }
    ): void => cb(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  }
}

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)

export type DesktopBridge = typeof desktopBridge
