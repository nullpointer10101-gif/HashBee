export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string
    [key: string]: any
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        initDataUnsafe?: any
        version: string
        platform: string
        colorScheme: 'light' | 'dark'
        themeParams: Record<string, string>
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        headerColor: string
        backgroundColor: string
        ready: () => void
        expand: () => void
        close: () => void
        openTelegramLink: (url: string) => void
        openLink: (url: string) => void
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
      }
    }
    show_11894371?: (options?: any) => Promise<void>
  }
}

