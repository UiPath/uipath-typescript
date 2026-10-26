/**
 * API Endpoint Constants
 *
 * One folder per service domain, named after its `src/services/` folder, so a
 * change to a domain's endpoints runs only that domain's integration suite.
 * `base.ts` and this barrel are ignored by that scoping: every new service adds
 * a line to each, and its own folder and suite trigger its run.
 */

// Base paths
export * from './base';

// Action Center
export * from './action-center/tasks';

// Agents
export * from './agents/agents';
export * from './agents/feedback';
export * from './agents/memory';

// AgentHub LLM gateway
export * from './agenthub/agenthub';

// Conversational Agent
export * from './conversational-agent/conversational-agent';

// Data Fabric
export * from './data-fabric/data-fabric';

// Document Understanding framework
export * from './document-understanding/document-understanding';

// Governance
export * from './governance/governance';

// Integration Service
export * from './integration-service/integration-service';

// Maestro
export * from './maestro/maestro';

// Notification
export * from './notification/notification';

// Observability
export * from './observability/agent-traces';
export * from './observability/traces';

// Orchestrator
export * from './orchestrator/orchestrator';

// Platform
export * from './platform/authorization';
export * from './platform/identity';
export * from './platform/platform';
