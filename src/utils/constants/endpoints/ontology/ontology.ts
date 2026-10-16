/**
 * Ontology Service Endpoints
 */

import { ONTOLOGY_BASE } from '../base';

export const ONTOLOGY_ENDPOINTS = {
  /** Collection route — POST creates, GET lists. */
  COLLECTION: `${ONTOLOGY_BASE}/api/ontology`,
  /** Single-ontology route — GET reads, PATCH updates, DELETE removes. */
  BY_ID: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${encodeURIComponent(idOrName)}`,
  EXPORT: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${encodeURIComponent(idOrName)}/export`,
  ARTIFACT: {
    /** Artifact collection route — GET lists, POST bulk-uploads. */
    COLLECTION: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${encodeURIComponent(idOrName)}/artifact`,
    /** Single-artifact route — GET reads, PUT upserts, DELETE removes. */
    BY_NAME: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${encodeURIComponent(idOrName)}/artifact/${encodeURIComponent(fileName)}`,
    VALIDATE: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${encodeURIComponent(idOrName)}/artifact/${encodeURIComponent(fileName)}/validate`,
  },
} as const;
