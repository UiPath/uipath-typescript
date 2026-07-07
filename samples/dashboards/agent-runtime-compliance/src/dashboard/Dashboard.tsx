import React from 'react'
import { useState } from 'react'
import { Header } from '@/dashboard/components/Header'
import { SegmentedToggle } from '@/dashboard/components/SegmentedToggle'
import { InfoTip } from '@/dashboard/components/InfoTip'
import { type RangeKey } from '@/lib/time'
import { AgentGovernanceViolations } from './widgets/AgentGovernanceViolations'
import { PoliciesWithViolations } from './widgets/PoliciesWithViolations'
import { FlaggedAgents } from './widgets/FlaggedAgents'
import { EnforcementOutcomes } from './widgets/EnforcementOutcomes'
import { AgentsByViolations } from './widgets/AgentsByViolations'
import { ViolationReasons } from './widgets/ViolationReasons'
import { AgentComplianceReport } from './widgets/AgentComplianceReport'

export function Dashboard() {
  const [kpiRange, setKpiRange] = useState<RangeKey>('30d')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 md:py-10">
        <Header title="Agent Runtime Compliance" description="UiPath compliance check results, enforcement outcomes, and flagged agents across your AI agent fleet." />

          {/* KPI row — one shared range toggle governs all three tiles */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
              <InfoTip text="These metrics come from UiPath's runtime compliance checks — recommendations from governance packs (e.g. ISO/IEC 42001) evaluated on every agent run. They are not admin-deployed UiPath policies (Automation Ops / Access): a failed check is a compliance recommendation being breached, not a policy violation." />
            </div>
            <SegmentedToggle options={['24h', '7d', '30d'] as const} value={kpiRange} onChange={setKpiRange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AgentGovernanceViolations range={kpiRange} />
            <PoliciesWithViolations range={kpiRange} />
            <FlaggedAgents range={kpiRange} />
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
            <EnforcementOutcomes />
            <ViolationReasons />
          </div>
          {/* Tables */}
          <div className="space-y-6 mt-10">
            <AgentsByViolations />
            <AgentComplianceReport />
          </div>
      </div>
    </div>
  )
}
