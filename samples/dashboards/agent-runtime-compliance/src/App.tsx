import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './dashboard/components/ErrorBoundary'
import { LoadingState } from './dashboard/components/LoadingState'

// Dashboard + views are generated per-build by the skill agent.
// The agent will add imports and routes below when building.
// DO NOT DELETE these comment markers — the agent uses them to inject code.

// GENERATED_IMPORTS_START
import { Dashboard } from '@/dashboard/Dashboard'
import { AgentGovernanceViolationsView } from '@/dashboard/views/AgentGovernanceViolationsView'
import { PoliciesWithViolationsView } from '@/dashboard/views/PoliciesWithViolationsView'
import { FlaggedAgentsView } from '@/dashboard/views/FlaggedAgentsView'
import { EnforcementOutcomesView } from '@/dashboard/views/EnforcementOutcomesView'
import { ViolationReasonsView } from '@/dashboard/views/ViolationReasonsView'
import { AgentsByViolationsDetailView } from '@/dashboard/views/AgentsByViolationsDetailView'
import { AgentComplianceReportDetailView } from '@/dashboard/views/AgentComplianceReportDetailView'
// GENERATED_IMPORTS_END

function AppContent() {
  // AuthProvider is the SINGLE OAuth driver. Do NOT start a second
  // sdk.initialize() here: AuthProvider's init effect already does
  // completeOAuth() on callback (else sdk.initialize() for a fresh login). A
  // competing driver re-runs sdk.initialize() after the code is consumed and
  // stripped from the URL → "Authorization code missing in OAuth callback" +
  // an extra redirect bounce.
  const { isAuthenticated, isLoading, error } = useAuth()

  if (isLoading || (!isAuthenticated && !error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState height="h-20" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Authentication error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* GENERATED_ROUTES_START */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/agentgovernanceviolations" element={<AgentGovernanceViolationsView />} />
        <Route path="/policieswithviolations" element={<PoliciesWithViolationsView />} />
        <Route path="/flaggedagents" element={<FlaggedAgentsView />} />
        <Route path="/enforcementoutcomes" element={<EnforcementOutcomesView />} />
        <Route path="/violationreasons" element={<ViolationReasonsView />} />
        <Route path="/agentsbyviolations/:key" element={<AgentsByViolationsDetailView />} />
        <Route path="/agentcompliancereport/:key" element={<AgentComplianceReportDetailView />} />
        {/* GENERATED_ROUTES_END */}
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
