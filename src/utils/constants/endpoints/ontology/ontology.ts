/**
 * Ontology Service Endpoints
 */

import { ONTOLOGY_BASE } from '../base';

export const ONTOLOGY_ENDPOINTS = {
  /** Collection route — GET lists the ontologies in a folder. */
  COLLECTION: `${ONTOLOGY_BASE}/api/v1/ontology`,
  /** Single-ontology route — GET reads one ontology. */
  BY_ID: (idOrName: string) => `${ONTOLOGY_BASE}/api/v1/ontology/${encodeURIComponent(idOrName)}`,
  ARTIFACT: {
    /** Ontology-free validation route — POST validates content without storing it. */
    VALIDATE_CONTENT: (fileName: string) => `${ONTOLOGY_BASE}/api/v1/artifact/${encodeURIComponent(fileName)}/validate`,
  },
} as const;
