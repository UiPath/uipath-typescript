/**
 * Access request store — backed by a shared Data Fabric entity.
 *
 * Requests live in the `AccessRequests` entity (id in `./config`), so every
 * user — requester and approver alike — sees the same queue from any browser.
 * Requires the `DataFabric.Data.Read` / `DataFabric.Data.Write` scopes on the
 * app registration, and Data Fabric data access for the signed-in user.
 * The request id is Data Fabric's system `Id`.
 *
 * NOTE: the entity is coordination data, not authority. Anyone with DF data
 * access could edit request rows directly — but a forged "approved" row grants
 * nothing: the actual group/role grant happens only when an admin's own token
 * calls the platform APIs, which re-authorize server-side.
 */

import type { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import { ACCESS_REQUESTS_ENTITY_ID } from './config';

export type RequestKind = 'group' | 'role';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface AccessRequest {
  id: string;
  kind: RequestKind;
  /** GUID of the requested group or role. */
  targetId: string;
  /** Display name of the requested group or role. */
  targetName: string;
  justification: string;
  requestedById: string;
  requestedByName: string;
  status: RequestStatus;
  createdTime: string;
  /** Set when an admin resolves the request. */
  resolvedByName?: string;
  resolvedTime?: string;
}

/** What callers provide on create — the store assigns the id. */
export type NewAccessRequest = Omit<AccessRequest, 'id'>;

export interface RequestStore {
  list(): Promise<AccessRequest[]>;
  create(request: NewAccessRequest): Promise<AccessRequest>;
  update(request: AccessRequest): Promise<void>;
}

/** DF record shape: the entity's user-defined columns plus the system Id. */
interface AccessRequestRecord {
  Id: string;
  kind: string;
  targetId: string;
  targetName: string;
  justification: string | null;
  requestedById: string;
  requestedByName: string | null;
  status: string;
  createdTime: string | null;
  resolvedByName?: string | null;
  resolvedTime?: string | null;
}

class DataFabricRequestStore implements RequestStore {
  constructor(private entities: Entities, private entityId: string) {}

  async list(): Promise<AccessRequest[]> {
    const result = await this.entities.getAllRecords(this.entityId);
    const records = result.items as unknown as AccessRequestRecord[];
    return records
      .map(r => ({
        id: r.Id,
        kind: r.kind as RequestKind,
        targetId: r.targetId,
        targetName: r.targetName,
        justification: r.justification ?? '',
        requestedById: r.requestedById,
        requestedByName: r.requestedByName ?? '',
        status: r.status as RequestStatus,
        createdTime: r.createdTime ?? '',
        resolvedByName: r.resolvedByName ?? undefined,
        resolvedTime: r.resolvedTime ?? undefined,
      }))
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  }

  async create(request: NewAccessRequest): Promise<AccessRequest> {
    const inserted = await this.entities.insertRecordById(this.entityId, { ...request });
    return { ...request, id: (inserted as { Id: string }).Id };
  }

  async update(request: AccessRequest): Promise<void> {
    const { id, ...fields } = request;
    await this.entities.updateRecordById(this.entityId, id, { ...fields });
  }
}

export function createRequestStore(sdk: UiPath): RequestStore {
  if (!ACCESS_REQUESTS_ENTITY_ID) {
    throw new Error('ACCESS_REQUESTS_ENTITY_ID is not configured — see src/lib/config.ts');
  }
  return new DataFabricRequestStore(new Entities(sdk), ACCESS_REQUESTS_ENTITY_ID);
}
