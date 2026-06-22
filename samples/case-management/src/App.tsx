import { Routes, Route } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert';
import { Button } from '@uipath/apollo-wind/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { CasesProvider, useCases } from '@/hooks/useCases';
import { Layout } from '@/components/Layout';
import { CasePickerScreen } from '@/components/CasePicker';
import { Loading, ErrorState } from '@/components/ui';
import { Dashboard } from '@/pages/Dashboard';
import { CasesList } from '@/pages/CasesList';
import { CaseDetail } from '@/pages/CaseDetail';
import { ActionsPage } from '@/pages/ActionsPage';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';

function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Case Management</CardTitle>
          <CardDescription>Live case workspace powered by the UiPath Maestro Cases API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={login} disabled={isLoading} className="w-full">
            Sign in with UiPath
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Renders the app once a case is selected; otherwise prompts the user to pick one. */
function ScopedApp() {
  const { loading, error, caseDefinition } = useCases();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Loading cases…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorState message={error} />
        </div>
      </div>
    );
  }
  // No case chosen yet (multiple available, or none in the tenant) — let the user pick.
  if (!caseDefinition) return <CasePickerScreen />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<CasesList />} />
        <Route path="/cases/:folderKey/:instanceId" element={<CaseDetail />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Initializing UiPath SDK…" />
      </div>
    );
  }
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <CasesProvider>
      <ScopedApp />
    </CasesProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
