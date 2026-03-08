import { contextBridge, ipcRenderer } from 'electron'

const desktopBridge = {
  // Auth
  getAuthState: (): Promise<{ authenticated: boolean }> =>
    ipcRenderer.invoke('get-auth-state'),
  loginSuccess: (token: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('login-success', token),
  logout: (): Promise<{ success: boolean }> => ipcRenderer.invoke('logout'),

  // System
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),

  // Notifications
  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('show-notification', { title, body }),
  updateBadge: (count: number): Promise<void> => ipcRenderer.invoke('update-badge', count),
  onNotification: (cb: (data: { title: string; body: string }) => void): (() => void) => {
    ipcRenderer.on('portal-notification', (_event, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('portal-notification')
  },

  // Auth state changes pushed from main process
  onAuthStateChanged: (cb: (state: { authenticated: boolean }) => void): (() => void) => {
    ipcRenderer.on('auth-state-changed', (_event, state) => cb(state))
    return () => ipcRenderer.removeAllListeners('auth-state-changed')
  },

  // Focus notifications
  onFocusNotifications: (cb: () => void): (() => void) => {
    ipcRenderer.on('focus-notifications', cb)
    return () => ipcRenderer.removeAllListeners('focus-notifications')
  }
}

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)

export type DesktopBridge = typeof desktopBridge
