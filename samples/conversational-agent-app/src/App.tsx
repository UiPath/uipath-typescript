import { ConversationalAgentProvider } from './context/ConversationalAgentContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatLayout } from './components/ChatLayout'
import { LoginScreen } from './components/LoginScreen'
import { Spinner } from './components/Spinner'

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
