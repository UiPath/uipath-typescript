import { ConversationalAgentProvider } from './context/ConversationalAgentContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatLayout } from './components/ChatLayout'
import { LoginScreen } from './components/LoginScreen'
import { Spinner } from './components/Spinner'
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core'

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE,
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-chat-bg">
        <div className="text-center">
          <Spinner className="w-8 h-8 border-accent mx-auto mb-4" />
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <ConversationalAgentProvider>
      <ChatLayout />
    </ConversationalAgentProvider>
  )
}

function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  )
}

export default App
