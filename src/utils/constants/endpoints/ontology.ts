/**
 * Ontology Service Endpoints
 */

import { ONTOLOGY_BASE } from './base';

export const ONTOLOGY_ENDPOINTS = {
  GET_ALL: `${ONTOLOGY_BASE}/api/ontology`,
  CREATE: `${ONTOLOGY_BASE}/api/ontology`,
  GET_BY_ID: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}`,
  UPDATE: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}`,
  DELETE: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}`,
  EXPORT: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/export`,
  ARTIFACT: {
    GET_ALL: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact`,
    UPLOAD_BULK: (idOrName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact`,
    GET: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact/${fileName}`,
    UPSERT: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact/${fileName}`,
    DELETE: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact/${fileName}`,
    VALIDATE: (idOrName: string, fileName: string) => `${ONTOLOGY_BASE}/api/ontology/${idOrName}/artifact/${fileName}/validate`,
  },
} as const;
